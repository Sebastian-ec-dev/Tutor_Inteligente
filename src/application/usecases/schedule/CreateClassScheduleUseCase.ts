import { ClassSchedule, normalizeTimeString, timeToMinutes } from '../../../domain/entities/ClassSchedule';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassScheduleRepositoryPort } from '../../../domain/ports/ClassScheduleRepositoryPort';
import { SubjectRepositoryPort } from '../../../domain/ports/SubjectRepositoryPort';

export type CreateClassScheduleInput = {
  subjectId?: string;
  subjectName?: string;
  teacher?: string;
  color?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateClassScheduleUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly subjectRepository: SubjectRepositoryPort,
    private readonly scheduleRepository: ClassScheduleRepositoryPort,
  ) {}

  async execute(input: CreateClassScheduleInput) {
    input.startTime = normalizeTimeString(input.startTime);
    input.endTime = normalizeTimeString(input.endTime);
    if (!TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime)) {
      throw new Error('Ingrese las horas con formato HH:MM, por ejemplo 08:30');
    }
    if (timeToMinutes(input.startTime) >= timeToMinutes(input.endTime)) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    const userId = await this.authRepository.getCurrentUserId();
    const subjects = await this.subjectRepository.listByUser(userId);

    let subject = input.subjectId
      ? subjects.find((item) => item.id === input.subjectId)
      : undefined;

    const cleanName = input.subjectName?.trim() || '';
    if (!subject && cleanName) {
      subject = subjects.find(
        (item) => item.name.trim().toLowerCase() === cleanName.toLowerCase(),
      );
    }

    if (!subject) {
      if (!cleanName) throw new Error('Seleccione o escriba una materia');
      subject = await this.subjectRepository.create({
        userId,
        name: cleanName,
        teacher: input.teacher?.trim() || undefined,
        color: input.color || '#2563EB',
        icon: '📚',
      });
    }

    const entry: ClassSchedule = {
      id: `schedule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      subjectId: subject.id,
      subjectName: subject.name,
      teacher: subject.teacher || input.teacher || null,
      color: subject.color || input.color || '#2563EB',
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      createdAt: new Date().toISOString(),
    };

    await this.scheduleRepository.save(entry);
    return { subject, entry };
  }
}
