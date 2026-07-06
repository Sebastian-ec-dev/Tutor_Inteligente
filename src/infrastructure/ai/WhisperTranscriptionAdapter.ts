import { TranscriptionPort } from '../../domain/ports/TranscriptionPort';
import { env } from '../../shared/config/env';

export class WhisperTranscriptionAdapter implements TranscriptionPort {
  readonly name = 'OpenAI Whisper / transcriptor de audio';

  constructor(private readonly fallbackTranscriber?: TranscriptionPort) {}

  async transcribeAudio(input: { base64Audio: string; mimeType: string }): Promise<string> {
    // El cliente móvil no debe exponer flujos sensibles de subida directa con claves secretas.
    // Para prototipo, si no hay API key o si falla la ruta remota, se usa el transcriptor de respaldo.
    if (!env.openAIApiKey) {
      if (this.fallbackTranscriber) return this.fallbackTranscriber.transcribeAudio(input);
      throw new Error('OpenAI Whisper requiere EXPO_PUBLIC_OPENAI_API_KEY o un transcriptor de respaldo.');
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
                  text: 'Transcribe este audio académico. Omite contraseñas, usuarios, correos, teléfonos, identificaciones y datos sensibles.',
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
      const textParts = content
        .filter((item: any) => item.type === 'output_text' || item.type === 'text')
        .map((item: any) => item.text || '')
        .join('\n');

      if (textParts.trim()) return textParts;
      throw new Error('La respuesta de transcripción no devolvió texto.');
    } catch (error) {
      if (this.fallbackTranscriber) return this.fallbackTranscriber.transcribeAudio(input);
      throw error;
    }
  }
}
