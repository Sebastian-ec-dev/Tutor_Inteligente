import { isScheduleActive } from '../../../domain/entities/ClassSchedule';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassScheduleRepositoryPort } from '../../../domain/ports/ClassScheduleRepositoryPort';

export class FindActiveClassScheduleUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly scheduleRepository: ClassScheduleRepositoryPort,
  ) {}

  async execute(date = new Date()) {
    const userId = await this.authRepository.getCurrentUserId();
    const entries = await this.scheduleRepository.listByUser(userId);
    return entries.find((entry) => isScheduleActive(entry, date)) || null;
  }
}
