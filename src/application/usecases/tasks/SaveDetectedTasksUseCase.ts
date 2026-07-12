import { NewClassTask } from '../../../domain/entities/ClassTask';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassTaskRepositoryPort } from '../../../domain/ports/ClassTaskRepositoryPort';

export class SaveDetectedTasksUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly repository: ClassTaskRepositoryPort,
  ) {}

  async execute(tasks: NewClassTask[]) {
    if (!tasks.length) return [];
    const userId = await this.authRepository.getCurrentUserId();
    return this.repository.mergeForAudio(userId, tasks);
  }
}
