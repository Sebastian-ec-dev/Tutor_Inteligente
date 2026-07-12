import {
  AIModelPort,
  AIRequestOptions,
  AITextPart,
} from '../../domain/ports/AIModelPort';
import { ClassContentType } from '../../domain/entities/ClassContentType';
import { buildClassAnalysisPrompt } from '../../application/promptBuilders';
import { env } from '../../shared/config/env';
import { GeminiAIModelAdapter } from './GeminiAIModelAdapter';

export class GptMathAIModelAdapter implements AIModelPort {
  readonly name = 'OpenAI GPT-4.1 mini / modo Light';

  constructor(private readonly fallbackModel: AIModelPort = new GeminiAIModelAdapter()) {}

  async generateText(
    prompt: string,
    attachment?: AITextPart,
    options?: AIRequestOptions,
  ): Promise<string> {
    if (!env.openAIApiKey) {
      return this.fallbackModel.generateText(
        `[Ruta OpenAI solicitada. Prioriza razonamiento paso a paso, ejercicios, fórmulas e interpretación visual.]\n\n${prompt}`,
        attachment,
        options,
      );
    }

    const input: any[] = [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }],
      },
    ];

    if (attachment?.base64Data && attachment.mimeType?.startsWith('image/')) {
      input[0].content.push({
        type: 'input_image',
        image_url: `data:${attachment.mimeType};base64,${attachment.base64Data}`,
      });
    }

    const useWebSearch =
      !!options?.enableWebSearch && env.enableTutorWebSearch && !attachment?.base64Data;

    const payload: Record<string, unknown> = {
      model: env.openAIMathModel,
      input,
      temperature: options?.temperature ?? env.aiChatTemperature,
    };

    if (useWebSearch) {
      payload.tools = [{ type: 'web_search', search_context_size: 'low' }];
      payload.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error usando OpenAI: ${errorText}`);
    }

    const data = await response.json();
    if (typeof data.output_text === 'string') return data.output_text;

    const content = data.output?.flatMap((item: any) => item.content || []) || [];
    const textParts = content
      .filter((item: any) => item.type === 'output_text' || item.type === 'text')
      .map((item: any) => item.text || '')
      .join('\n');

    return textParts || '';
  }

  async analyzeClass(input: {
    content: string;
    contentType: ClassContentType;
  }): Promise<string> {
    const prompt = buildClassAnalysisPrompt(input.content, input.contentType);
    return this.generateText(prompt, undefined, {
      temperature: env.aiSummaryTemperature,
      enableWebSearch: false,
    });
  }
}
