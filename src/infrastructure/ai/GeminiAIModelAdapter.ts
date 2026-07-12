import {
  AIModelPort,
  AIRequestOptions,
  AITextPart,
} from '../../domain/ports/AIModelPort';
import { ClassContentType } from '../../domain/entities/ClassContentType';
import { buildClassAnalysisPrompt } from '../../application/promptBuilders';
import { getGeminiClient } from './geminiClient';
import { env } from '../../shared/config/env';

export class GeminiAIModelAdapter implements AIModelPort {
  readonly name = 'Google Gemini 2.5 Flash';

  async generateText(
    prompt: string,
    attachment?: AITextPart,
    options?: AIRequestOptions,
  ): Promise<string> {
    let contents: any[] = [prompt];

    if (attachment?.mimeType && attachment.base64Data) {
      contents = [
        prompt,
        {
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64Data,
          },
        },
      ];
    }

    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        temperature: options?.temperature ?? env.aiChatTemperature,
      },
    } as any);

    return response.text || '';
  }

  async analyzeClass(input: {
    content: string;
    contentType: ClassContentType;
  }): Promise<string> {
    const prompt = buildClassAnalysisPrompt(input.content, input.contentType);
    return this.generateText(prompt, undefined, {
      temperature: env.aiSummaryTemperature,
    });
  }
}
