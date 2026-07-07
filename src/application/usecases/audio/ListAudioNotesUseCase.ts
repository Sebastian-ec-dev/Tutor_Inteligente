import { AudioNote } from '../../../domain/entities/AudioNote';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';

export class ListAudioNotesUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly audioNoteRepository: AudioNoteRepositoryPort,
  ) {}

  async execute(subjectId: string): Promise<AudioNote[]> {
    const userId = await this.authRepository.getCurrentUserId();
    return this.audioNoteRepository.listBySubject(subjectId, userId);
  }
}
