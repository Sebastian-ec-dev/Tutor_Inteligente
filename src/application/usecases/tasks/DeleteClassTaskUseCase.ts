import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassTaskRepositoryPort } from '../../../domain/ports/ClassTaskRepositoryPort';

export class DeleteClassTaskUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly repository: ClassTaskRepositoryPort,
  ) {}

  async execute(taskId: string) {
    const userId = await this.authRepository.getCurrentUserId();
    await this.repository.delete(userId, taskId);
  }

  async deleteByAudio(audioNoteId: string) {
    const userId = await this.authRepository.getCurrentUserId();
    await this.repository.deleteByAudio(userId, audioNoteId);
  }
}
