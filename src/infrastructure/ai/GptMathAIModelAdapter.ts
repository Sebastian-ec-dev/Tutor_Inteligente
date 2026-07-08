import { AIModelPort, AITextPart } from '../../domain/ports/AIModelPort';
import { ClassContentType } from '../../domain/entities/ClassContentType';
import { buildClassAnalysisPrompt } from '../../application/promptBuilders';
import { env } from '../../shared/config/env';

export class GptMathAIModelAdapter implements AIModelPort {
  readonly name = 'OpenAI GPT-4.1 mini / modo Light';

  constructor(private readonly fallbackModel?: AIModelPort) {}

  async generateText(prompt: string, attachment?: AITextPart): Promise<string> {
    return this.requestText(prompt, attachment, env.aiChatTemperature, env.openAIChatModel);
  }

  async analyzeClass(input: { content: string; contentType: ClassContentType }): Promise<string> {
    const prompt = buildClassAnalysisPrompt(input.content, input.contentType);
    return this.requestText(prompt, undefined, env.aiSummaryTemperature, env.openAISummaryModel);
  }

  private async requestText(
    prompt: string,
    attachment: AITextPart | undefined,
    temperature: number,
    textModel: string,
  ): Promise<string> {
    // En Expo se permite probar sin romper el flujo: si no hay clave OpenAI,
    // se usa el adaptador de respaldo. La pantalla sigue entrando por la ruta GPT.
    if (!env.openAIApiKey) {
      if (this.fallbackModel) {
        return this.fallbackModel.generateText(
          `[Ruta OpenAI GPT-4.1 mini / modo Light solicitada. Temperatura configurada: ${temperature}. Prioriza respuestas precisas, razonamiento paso a paso, ejercicios, fórmulas e interpretación visual.]\n\n${prompt}`,
          attachment,
        );
      }

      throw new Error('Falta configurar EXPO_PUBLIC_OPENAI_API_KEY para usar GPT / OpenAI.');
    }

    const input: any[] = [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }];

    if (attachment?.base64Data && attachment.mimeType?.startsWith('image/')) {
      input[0].content.push({
        type: 'input_image',
        image_url: `data:${attachment.mimeType};base64,${attachment.base64Data}`,
      });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: attachment?.mimeType?.startsWith('image/') ? env.openAIVisionModel : textModel,
        input,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error usando OpenAI GPT para matemática o imágenes: ${errorText}`);
    }

    const data = await response.json();
    const outputText = data.output_text;

    if (typeof outputText === 'string') return outputText;

    const content = data.output?.flatMap((item: any) => item.content || []) || [];
    const textParts = content
      .filter((item: any) => item.type === 'output_text' || item.type === 'text')
      .map((item: any) => item.text || '')
      .join('\n');

    return textParts || '';
  }
}
