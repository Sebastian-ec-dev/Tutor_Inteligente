import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';

export class DeleteAudioNoteUseCase {
  constructor(private readonly audioNoteRepository: AudioNoteRepositoryPort) {}

  async execute(audioNoteId: string): Promise<void> {
    if (!audioNoteId) throw new Error('No se encontró la clase seleccionada');
    await this.audioNoteRepository.deleteAudioNote(audioNoteId);
  }
}
