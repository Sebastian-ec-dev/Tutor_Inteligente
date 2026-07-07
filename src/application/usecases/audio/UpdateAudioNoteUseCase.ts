import { AudioNote } from '../../../domain/entities/AudioNote';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';

export class UpdateAudioNoteUseCase {
  constructor(private readonly audioNoteRepository: AudioNoteRepositoryPort) {}

  async execute(input: { id: string; title: string }): Promise<AudioNote> {
    const title = input.title.trim();
    if (!input.id) throw new Error('No se encontró la clase seleccionada');
    if (!title) throw new Error('El nombre de la clase no puede estar vacío');

    return this.audioNoteRepository.updateAudioNote({ id: input.id, title });
  }
}
