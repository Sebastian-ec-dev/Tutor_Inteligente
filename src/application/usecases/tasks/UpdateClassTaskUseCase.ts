import { ClassTask } from '../../../domain/entities/ClassTask';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassTaskRepositoryPort } from '../../../domain/ports/ClassTaskRepositoryPort';

export class UpdateClassTaskUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly repository: ClassTaskRepositoryPort,
  ) {}

  async execute(taskId: string, patch: Partial<Pick<ClassTask, 'text' | 'details' | 'dueAt' | 'completed'>>) {
    const userId = await this.authRepository.getCurrentUserId();
    if (patch.text !== undefined && !patch.text.trim()) throw new Error('La tarea no puede quedar vacía.');
    return this.repository.update(userId, taskId, patch);
  }
}
