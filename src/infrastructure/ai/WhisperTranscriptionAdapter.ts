import { TranscriptionPort } from '../../domain/ports/TranscriptionPort';
import { buildTranscriptionPrompt } from '../../application/promptBuilders';
import { env } from '../../shared/config/env';

export class WhisperTranscriptionAdapter implements TranscriptionPort {
  readonly name = 'OpenAI Whisper / transcriptor de audio';

  async transcribeAudio(input: { base64Audio: string; mimeType: string }): Promise<string> {
    if (!env.openAIApiKey) {
      throw new Error('Falta configurar la clave de OpenAI para transcribir audio.');
    }

    try {
      // Implementación compatible para prototipo con Responses API usando audio base64.
      // En producción se recomienda mover esta llamada a un backend seguro.
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.openAITranscriptionModel,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: buildTranscriptionPrompt(),
                },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: input.base64Audio,
                    format: input.mimeType.includes('mpeg') || input.mimeType.includes('mp3') ? 'mp3' : 'wav',
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (typeof data.output_text === 'string' && data.output_text.trim()) {
        return data.output_text;
      }

      const content = data.output?.flatMap((item: any) => item.content || []) || [];
      const textParts = content.reduce((acc: string[], item: any) => {
        if (item.type === 'output_text' || item.type === 'text') {
          acc.push(item.text || '');
        }
        return acc;
      }, []).join('\n');

      if (textParts.trim()) return textParts;
      throw new Error('La respuesta de transcripción no devolvió texto.');
    } catch (error: any) {
      const message = error?.message || String(error);
      throw new Error(`No se pudo transcribir el audio con OpenAI: ${message}`);
    }
  }
}
