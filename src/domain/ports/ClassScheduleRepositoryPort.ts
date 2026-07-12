import { ClassSchedule } from '../entities/ClassSchedule';

export interface ClassScheduleRepositoryPort {
  listByUser(userId: string): Promise<ClassSchedule[]>;
  save(entry: ClassSchedule): Promise<ClassSchedule>;
  delete(userId: string, scheduleId: string): Promise<void>;
}
