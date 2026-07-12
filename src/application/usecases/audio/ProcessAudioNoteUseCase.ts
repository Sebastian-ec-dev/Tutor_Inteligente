import { ClassContentType } from '../../../domain/entities/ClassContentType';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';
import { AIModelRouterPort } from '../../../domain/ports/AIModelRouterPort';
import { FileReaderPort } from '../../../domain/ports/FileReaderPort';
import { PrivacyFilterPort } from '../../../domain/ports/PrivacyFilterPort';
import { TranscriptionPort } from '../../../domain/ports/TranscriptionPort';
import {
  formatDetectedTasks,
  parseAITaskDetectionResponse,
} from '../../taskDetection';
import { buildTaskDetectionPrompt } from '../../promptBuilders';

export type ProcessAudioProgress = string;

export class ProcessAudioNoteUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly fileReader: FileReaderPort,
    private readonly transcriber: TranscriptionPort,
    private readonly privacyFilter: PrivacyFilterPort,
    private readonly modelRouter: AIModelRouterPort,
    private readonly audioNoteRepository: AudioNoteRepositoryPort,
  ) {}

  async execute(input: {
    title?: string;
    subjectId: string;
    audioUri?: string;
    transcriptText?: string;
    mimeType: string;
    contentType: ClassContentType;
    audioNoteId?: string;
    onProgress?: (progress: ProcessAudioProgress) => void;
  }) {
    if (!input.subjectId) throw new Error('Selecciona una materia para guardar el apunte');
    if (!input.audioUri && !input.transcriptText?.trim()) {
      throw new Error('No hay audio ni transcripción para procesar');
    }

    const userId = await this.authRepository.getCurrentUserId();
    let rawTranscript = (input.transcriptText || '').trim();

    if (!rawTranscript) {
      input.onProgress?.('Transcribiendo audio con OpenAI gpt-4o-mini-transcribe...');
      const audioUri = input.audioUri as string;
      rawTranscript = await this.transcriber.transcribeAudio({
        audioUri,
        mimeType: input.mimeType || 'audio/m4a',
        fileName: buildAudioFileName(input.mimeType || 'audio/m4a'),
        getBase64Audio: () => this.fileReader.readAsBase64(audioUri),
      });
      input.onProgress?.('Transcripción completada con OpenAI. Preparando apuntes...');
    } else {
      input.onProgress?.('Usando la transcripción disponible para generar apuntes...');
    }

    const cleanTranscript = this.privacyFilter.clean(rawTranscript);
    const selectedCapability = this.modelRouter.getCapability(input.contentType);
    const selectedModel = this.modelRouter.selectModel(input.contentType);

    input.onProgress?.(
      `Generando apuntes con ${selectedCapability.provider} ${selectedCapability.modelName}...`,
    );

    const existingNote = input.audioNoteId
      ? await this.audioNoteRepository.getById(input.audioNoteId)
      : null;

    const finalTranscript = existingNote
      ? buildAppendedTranscript(existingNote.transcript || '', cleanTranscript)
      : cleanTranscript;

    const rawSummary = await selectedModel.analyzeClass({
      content: finalTranscript,
      contentType: input.contentType,
    });
    const cleanSummaryText = this.privacyFilter.clean(rawSummary || '');

    if (!cleanSummaryText.trim()) {
      throw new Error('No se pudo realizar el análisis');
    }

    const summaryWithoutTasks = removeLegacyTaskSections(cleanSummaryText);

    input.onProgress?.('Analizando con IA si existen tareas reales...');
    let taskCandidates = [] as ReturnType<typeof parseAITaskDetectionResponse>;
    try {
      const taskDetectionRaw = await selectedModel.generateText(
        buildTaskDetectionPrompt({
          transcript: finalTranscript,
          summary: summaryWithoutTasks,
        }),
        undefined,
        {
          temperature: 0.05,
          enableWebSearch: false,
        },
      );
      taskCandidates = parseAITaskDetectionResponse(taskDetectionRaw);
    } catch (error) {
      console.log('[ProcessAudioNoteUseCase] No se pudo clasificar tareas con IA:', error);
      // No se usa un filtro por palabras como respaldo, porque volvería a crear
      // falsos positivos. La clase se guarda sin tareas y puede revisarse luego.
      taskCandidates = [];
    }

    const finalDeberes = formatDetectedTasks(taskCandidates);
    const finalSummary = appendAITaskSection(summaryWithoutTasks, finalDeberes);

    if (existingNote) {
      input.onProgress?.('Guardando el nuevo audio dentro de la clase seleccionada...');
      const updated = await this.audioNoteRepository.updateAudioNote({
        id: existingNote.id,
        title: (input.title || existingNote.title).trim() || existingNote.title,
        transcript: finalTranscript,
        summary: finalSummary,
        deberes: finalDeberes,
        contentType: input.contentType,
      });
      input.onProgress?.('Clase actualizada correctamente.');
      return updated;
    }

    const finalTitle = buildFinalTitle(input.title, finalSummary, cleanTranscript);

    input.onProgress?.('Guardando clase, transcripción y resumen...');
    const audioNote = await this.audioNoteRepository.saveAudioNote({
      userId,
      subjectId: input.subjectId,
      title: finalTitle,
      transcript: cleanTranscript,
      summary: finalSummary,
      deberes: finalDeberes,
      contentType: input.contentType,
    });

    input.onProgress?.('Clase procesada correctamente.');
    return audioNote;
  }
}

function removeLegacyTaskSections(summary: string): string {
  return summary
    .replace(
      /##\s*Tareas (?:detectadas|identificadas por IA)[\s\S]*?(?=##\s*(?:Fecha de entrega detectada|Recomendaciones de estudio|Posibles preguntas importantes)|$)/i,
      '',
    )
    .replace(
      /##\s*Fecha de entrega detectada[\s\S]*?(?=##\s*(?:Recomendaciones de estudio|Posibles preguntas importantes)|$)/i,
      '',
    )
    .trim();
}

function appendAITaskSection(summary: string, formattedTasks: string): string {
  const section = [
    '## Tareas identificadas por IA',
    formattedTasks || 'No se identificaron tareas explícitas mediante IA.',
  ].join('\n');

  const questionsIndex = summary.search(/\n##\s*Posibles preguntas importantes/i);
  if (questionsIndex >= 0) {
    return `${summary.slice(0, questionsIndex).trim()}\n\n${section}\n${summary.slice(questionsIndex)}`.trim();
  }

  return `${summary.trim()}\n\n${section}`.trim();
}

function buildAppendedTranscript(previousTranscript: string, newTranscript: string): string {
  const separator = `\n\n---\n\nSEGMENTO DE AUDIO AGREGADO ${new Date().toLocaleString()}\n\n`;
  if (!previousTranscript.trim()) return newTranscript.trim();
  return `${previousTranscript.trim()}${separator}${newTranscript.trim()}`;
}

function buildFinalTitle(
  manualTitle: string | undefined,
  summary: string,
  transcript: string,
): string {
  const title = (manualTitle || '').trim();
  if (title) return title;

  const heading = summary
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length >= 6 && line.length <= 90);

  if (heading) return heading;

  const firstTranscriptLine = transcript
    .split(/[.!?\n]/)
    .map((line) => line.trim())
    .find((line) => line.length >= 10);

  if (firstTranscriptLine) return firstTranscriptLine.slice(0, 70);
  return `Clase procesada ${new Date().toLocaleDateString()}`;
}

function buildAudioFileName(mimeType: string): string {
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'clase.mp3';
  if (mimeType.includes('wav')) return 'clase.wav';
  if (mimeType.includes('webm')) return 'clase.webm';
  if (mimeType.includes('ogg')) return 'clase.ogg';
  return 'clase.m4a';
}
