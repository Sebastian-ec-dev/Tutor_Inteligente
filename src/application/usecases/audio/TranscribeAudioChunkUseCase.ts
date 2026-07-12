import { PrivacyFilterPort } from '../../../domain/ports/PrivacyFilterPort';
import { TranscriptionPort } from '../../../domain/ports/TranscriptionPort';

export class TranscribeAudioChunkUseCase {
  constructor(
    private readonly transcriber: TranscriptionPort,
    private readonly privacyFilter: PrivacyFilterPort,
  ) {}

  async execute(input: {
    audioUri: string;
    mimeType?: string;
    segmentIndex?: number;
  }): Promise<string> {
    if (!input.audioUri) return '';

    const mimeType = input.mimeType || 'audio/m4a';
    const rawTranscript = await this.transcriber.transcribeAudio({
      audioUri: input.audioUri,
      mimeType,
      fileName: buildSegmentFileName(mimeType, input.segmentIndex),
    });

    const clean = this.privacyFilter.clean(rawTranscript || '').trim();
    return removeKnownTranscriptionArtifacts(clean);
  }
}

function buildSegmentFileName(mimeType: string, segmentIndex = 0): string {
  const index = String(segmentIndex).padStart(3, '0');
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return `segmento-${index}.mp3`;
  if (mimeType.includes('wav')) return `segmento-${index}.wav`;
  if (mimeType.includes('webm')) return `segmento-${index}.webm`;
  if (mimeType.includes('ogg')) return `segmento-${index}.ogg`;
  return `segmento-${index}.m4a`;
}

function removeKnownTranscriptionArtifacts(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const promptEchoes = [
    'clase académica en español',
    'transcribe con puntuación clara',
    'conserva términos técnicos',
    'no repitas contraseñas',
    'correos teléfonos identificaciones',
  ];

  const lower = normalized
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');

  const looksLikePromptEcho = promptEchoes.some((fragment) =>
    lower.includes(fragment.normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
  );

  const commonHallucination = /^(gracias por ver|subt[ií]tulos|audio sin contenido|silencio)$/i.test(normalized);
  return looksLikePromptEcho || commonHallucination ? '' : normalized;
}
