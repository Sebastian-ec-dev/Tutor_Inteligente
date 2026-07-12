import { TranscriptionInput, TranscriptionPort } from '../../domain/ports/TranscriptionPort';
import { buildTranscriptionPrompt } from '../../application/promptBuilders';
import { GeminiAIModelAdapter } from './GeminiAIModelAdapter';
import { AIModelPort } from '../../domain/ports/AIModelPort';

export class GeminiAudioTranscriptionAdapter implements TranscriptionPort {
  constructor(private readonly aiModel: AIModelPort = new GeminiAIModelAdapter()) {}

  async transcribeAudio(input: TranscriptionInput): Promise<string> {
    if (!input.getBase64Audio) {
      throw new Error('No se pudo preparar el audio para el transcriptor de respaldo.');
    }

    const base64Audio = await input.getBase64Audio();
    return this.aiModel.generateText(buildTranscriptionPrompt(), {
      mimeType: input.mimeType,
      base64Data: base64Audio,
    });
  }
}
