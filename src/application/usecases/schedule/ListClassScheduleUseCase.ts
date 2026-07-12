import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassScheduleRepositoryPort } from '../../../domain/ports/ClassScheduleRepositoryPort';

export class ListClassScheduleUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly scheduleRepository: ClassScheduleRepositoryPort,
  ) {}

  async execute() {
    const userId = await this.authRepository.getCurrentUserId();
    return this.scheduleRepository.listByUser(userId);
  }
}
