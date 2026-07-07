import { ClassContentType } from "../../../domain/entities/ClassContentType";
import { AuthRepositoryPort } from "../../../domain/ports/AuthRepositoryPort";
import { AudioNoteRepositoryPort } from "../../../domain/ports/AudioNoteRepositoryPort";
import { AIModelRouterPort } from "../../../domain/ports/AIModelRouterPort";
import { FileReaderPort } from "../../../domain/ports/FileReaderPort";
import { PrivacyFilterPort } from "../../../domain/ports/PrivacyFilterPort";
import { TranscriptionPort } from "../../../domain/ports/TranscriptionPort";

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
    audioUri: string;
    mimeType: string;
    contentType: ClassContentType;
    audioNoteId?: string;
    onProgress?: (progress: ProcessAudioProgress) => void;
  }) {
    if (!input.subjectId)
      throw new Error("Selecciona una materia para guardar el apunte");
    if (!input.audioUri) throw new Error("No hay audio para procesar");

    const userId = await this.authRepository.getCurrentUserId();

    input.onProgress?.("Leyendo archivo de audio...");
    const base64Audio = await this.fileReader.readAsBase64(input.audioUri);

    input.onProgress?.(
      "Transcribiendo audio con OpenAI Whisper / transcriptor o adaptador de respaldo...",
    );
    const rawTranscript = await this.transcriber.transcribeAudio({
      base64Audio,
      mimeType: input.mimeType || "audio/m4a",
    });

    input.onProgress?.("Preparando contenido académico...");
    const cleanTranscript = this.privacyFilter.clean(rawTranscript);

    const selectedCapability = this.modelRouter.getCapability(
      input.contentType,
    );
    input.onProgress?.(
      `Seleccionando ${selectedCapability.provider} ${selectedCapability.modelName}: ${selectedCapability.bestFor}`,
    );
    const selectedModel = this.modelRouter.selectModel(input.contentType);

    const existingNote = input.audioNoteId
      ? await this.audioNoteRepository.getById(input.audioNoteId)
      : null;

    const finalTranscript = existingNote
      ? buildAppendedTranscript(existingNote.transcript || "", cleanTranscript)
      : cleanTranscript;

    input.onProgress?.(
      existingNote
        ? `Actualizando la clase con el nuevo segmento de audio usando ${selectedModel.name}...`
        : `Analizando clase con ${selectedModel.name}...`,
    );

    const rawSummary = await selectedModel.analyzeClass({
      content: finalTranscript,
      contentType: input.contentType,
    });
    const cleanSummaryText = this.privacyFilter.clean(rawSummary || "");

    if (!cleanSummaryText.trim()) {
      throw new Error("No se pudo realizar el análisis");
    }

    let finalSummary = cleanSummaryText;
    let finalDeberes = "";

    const tareasMatch = cleanSummaryText.match(
      /## Tareas detectadas([\s\S]*?)(?=## Recomendaciones de estudio|$)/i,
    );

    if (tareasMatch && tareasMatch[0]) {
      finalDeberes = tareasMatch[0].trim();
      finalSummary = cleanSummaryText.replace(tareasMatch[0], "").trim();
    }

    if (existingNote) {
      input.onProgress?.(
        "Guardando audio adicional dentro de la clase seleccionada...",
      );
      const updated = await this.audioNoteRepository.updateAudioNote({
        id: existingNote.id,
        title: (input.title || existingNote.title).trim() || existingNote.title,
        transcript: finalTranscript,
        summary: finalSummary,
        deberes: finalDeberes,
        contentType: input.contentType,
      });

      input.onProgress?.("Clase actualizada correctamente.");
      return updated;
    }

    const finalTitle = buildFinalTitle(
      input.title,
      finalSummary,
      cleanTranscript,
    );

    input.onProgress?.("Guardando clase/apunte procesado...");
    const audioNote = await this.audioNoteRepository.saveAudioNote({
      userId,
      subjectId: input.subjectId,
      title: finalTitle,
      transcript: cleanTranscript,
      summary: finalSummary,
      deberes: finalDeberes,
      contentType: input.contentType,
    });

    input.onProgress?.("Clase/apunte procesado correctamente.");

    return audioNote;
  }
}

function buildAppendedTranscript(
  previousTranscript: string,
  newTranscript: string,
): string {
  const separator = `\n\n---\n\nSEGMENTO DE AUDIO AGREGADO ${new Date().toLocaleString()}\n\n`;
  if (!previousTranscript.trim()) return newTranscript.trim();
  return `${previousTranscript.trim()}${separator}${newTranscript.trim()}`;
}

function buildFinalTitle(
  manualTitle: string | undefined,
  summary: string,
  transcript: string,
): string {
  const title = (manualTitle || "").trim();
  if (title) return title;

  const heading = summary
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line.length >= 6 && line.length <= 90);

  if (heading) return heading;

  const firstTranscriptLine = transcript
    .split(/[.!?\n]/)
    .map((line) => line.trim())
    .find((line) => line.length >= 10);

  if (firstTranscriptLine) return firstTranscriptLine.slice(0, 70);

  return `Clase procesada ${new Date().toLocaleDateString()}`;
}
