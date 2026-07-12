import { TranscriptionInput, TranscriptionPort } from '../../../domain/ports/TranscriptionPort';

export class MockTranscriptionAdapter implements TranscriptionPort {
  async transcribeAudio(_input: TranscriptionInput): Promise<string> {
    return 'Transcripción simulada de una clase académica. Este texto permite probar el flujo sin consumir una API real.';
  }
}
