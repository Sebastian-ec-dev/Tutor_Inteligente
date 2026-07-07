import { TranscriptionPort } from '../../../domain/ports/TranscriptionPort';

export class MockTranscriptionAdapter implements TranscriptionPort {
  async transcribeAudio(_input: { base64Audio: string; mimeType: string }): Promise<string> {
    return 'Transcripción simulada de una clase. El docente explica conceptos principales, ejemplos prácticos, tareas posibles y recomendaciones de estudio. La información irrelevante para el aprendizaje se omite antes de guardar.';
  }
}
