import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassTaskRepositoryPort } from '../../../domain/ports/ClassTaskRepositoryPort';

export class ListClassTasksUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly repository: ClassTaskRepositoryPort,
  ) {}

  async execute() {
    const userId = await this.authRepository.getCurrentUserId();
    return this.repository.listByUser(userId);
  }
}
