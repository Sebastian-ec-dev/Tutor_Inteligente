import { ClassContentType } from '../../../domain/entities/ClassContentType';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';
import { AIModelRouterPort } from '../../../domain/ports/AIModelRouterPort';
import { EmbeddingPort } from '../../../domain/ports/EmbeddingPort';
import { FileReaderPort } from '../../../domain/ports/FileReaderPort';
import { PrivacyFilterPort } from '../../../domain/ports/PrivacyFilterPort';
import { TranscriptionPort } from '../../../domain/ports/TranscriptionPort';
import { buildAudioEmbeddingChunks } from '../../textUtils';

export type ProcessAudioProgress = string;

export class ProcessAudioNoteUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly fileReader: FileReaderPort,
    private readonly transcriber: TranscriptionPort,
    private readonly privacyFilter: PrivacyFilterPort,
    private readonly modelRouter: AIModelRouterPort,
    private readonly embeddingService: EmbeddingPort,
    private readonly audioNoteRepository: AudioNoteRepositoryPort,
  ) {}

  async execute(input: {
    title: string;
    subjectId: string;
    audioUri: string;
    mimeType: string;
    contentType: ClassContentType;
    onProgress?: (progress: ProcessAudioProgress) => void;
  }) {
    const title = input.title.trim();
    if (!title) throw new Error('Por favor ingresa un título');
    if (!input.audioUri) throw new Error('No hay audio para procesar');

    const userId = await this.authRepository.getCurrentUserId();

    input.onProgress?.('Leyendo archivo de audio...');
    const base64Audio = await this.fileReader.readAsBase64(input.audioUri);

    input.onProgress?.('Transcribiendo audio con OpenAI Whisper / transcriptor o adaptador de respaldo...');
    const rawTranscript = await this.transcriber.transcribeAudio({
      base64Audio,
      mimeType: input.mimeType || 'audio/m4a',
    });

    input.onProgress?.('Filtrando datos sensibles...');
    const cleanTranscript = this.privacyFilter.clean(rawTranscript);

    const selectedCapability = this.modelRouter.getCapability(input.contentType);
    input.onProgress?.(`Seleccionando ${selectedCapability.provider} ${selectedCapability.modelName}: ${selectedCapability.bestFor}`);
    const selectedModel = this.modelRouter.selectModel(input.contentType);

    input.onProgress?.(`Analizando clase con ${selectedModel.name}...`);
    const rawSummary = await selectedModel.analyzeClass({
      content: cleanTranscript,
      contentType: input.contentType,
    });
    const cleanSummary = this.privacyFilter.clean(rawSummary || '');

    if (!cleanSummary.trim()) {
      throw new Error('No se pudo realizar el análisis');
    }

    input.onProgress?.('Guardando en la base de datos...');
    const audioNote = await this.audioNoteRepository.saveAudioNote({
      userId,
      subjectId: input.subjectId,
      title,
      transcript: cleanTranscript,
      summary: cleanSummary,
      contentType: input.contentType,
    });

    input.onProgress?.('Generando embeddings para búsqueda semántica...');
    const chunks = buildAudioEmbeddingChunks({
      title,
      summary: cleanSummary,
      transcript: cleanTranscript,
      chunkSize: 1000,
    });

    for (const chunk of chunks) {
      const embedding = await this.embeddingService.generateEmbedding(chunk);
      await this.audioNoteRepository.saveEmbedding({
        userId,
        audioId: audioNote.id,
        content: chunk,
        embedding,
      });
    }

    return audioNote;
  }
}
