import { TranscriptionInput, TranscriptionPort } from '../../domain/ports/TranscriptionPort';
import { env } from '../../shared/config/env';

const TRANSCRIPTION_TIMEOUT_MS = 120_000;

export class WhisperTranscriptionAdapter implements TranscriptionPort {
  readonly name = 'OpenAI gpt-4o-mini-transcribe';

  async transcribeAudio(input: TranscriptionInput): Promise<string> {
    if (!env.openAIApiKey) {
      throw new Error('Falta EXPO_PUBLIC_OPENAI_API_KEY para transcribir el audio con OpenAI.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

    try {
      const formData = new FormData();
      const fileName = input.fileName || buildAudioFileName(input.mimeType);

      formData.append('file', {
        uri: input.audioUri,
        name: fileName,
        type: normalizeMimeType(input.mimeType),
      } as any);
      formData.append('model', env.openAITranscriptionModel);
      formData.append('language', 'es');
      formData.append('response_format', 'json');
      formData.append('temperature', '0');
      formData.append(
        'prompt',
        'Clase académica en español. Transcribe con puntuación clara y conserva términos técnicos, nombres de asignaturas, fórmulas y consignas de tareas.',
      );

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.openAIApiKey}`,
          Accept: 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(buildOpenAIError(response.status, details));
      }

      const data = await response.json();
      if (typeof data.text === 'string' && data.text.trim()) {
        return data.text.trim();
      }

      throw new Error('OpenAI no devolvió texto para esta grabación.');
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error(
          'La transcripción superó el tiempo de espera. Prueba con una grabación más corta o una conexión más estable.',
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeMimeType(mimeType: string): string {
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'audio/mpeg';
  if (mimeType.includes('wav')) return 'audio/wav';
  if (mimeType.includes('webm')) return 'audio/webm';
  if (mimeType.includes('ogg')) return 'audio/ogg';
  return 'audio/mp4';
}

function buildAudioFileName(mimeType: string): string {
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'clase.mp3';
  if (mimeType.includes('wav')) return 'clase.wav';
  if (mimeType.includes('webm')) return 'clase.webm';
  if (mimeType.includes('ogg')) return 'clase.ogg';
  return 'clase.m4a';
}

function buildOpenAIError(status: number, details: string): string {
  if (status === 401) return 'La clave de OpenAI no es válida o no tiene acceso.';
  if (status === 413) return 'El audio es demasiado grande para transcribirlo en una sola solicitud.';
  if (status === 429) return 'OpenAI alcanzó el límite temporal de solicitudes o saldo.';
  return `OpenAI no pudo transcribir el audio (${status}). ${details.slice(0, 220)}`;
}
