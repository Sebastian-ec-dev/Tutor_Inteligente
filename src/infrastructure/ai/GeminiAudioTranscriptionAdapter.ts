import { TranscriptionPort } from '../../domain/ports/TranscriptionPort';
import { buildTranscriptionPrompt } from '../../application/promptBuilders';
import { GeminiAIModelAdapter } from './GeminiAIModelAdapter';
import { AIModelPort } from '../../domain/ports/AIModelPort';

export class GeminiAudioTranscriptionAdapter implements TranscriptionPort {
  constructor(private readonly aiModel: AIModelPort = new GeminiAIModelAdapter()) {}

  async transcribeAudio(input: { base64Audio: string; mimeType: string }): Promise<string> {
    return this.aiModel.generateText(buildTranscriptionPrompt(), {
      mimeType: input.mimeType,
      base64Data: input.base64Audio,
    });
  }
}
