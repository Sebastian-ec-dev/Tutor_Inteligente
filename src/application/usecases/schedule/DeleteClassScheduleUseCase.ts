import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassScheduleRepositoryPort } from '../../../domain/ports/ClassScheduleRepositoryPort';

export class DeleteClassScheduleUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly scheduleRepository: ClassScheduleRepositoryPort,
  ) {}

  async execute(scheduleId: string) {
    const userId = await this.authRepository.getCurrentUserId();
    await this.scheduleRepository.delete(userId, scheduleId);
  }
}
