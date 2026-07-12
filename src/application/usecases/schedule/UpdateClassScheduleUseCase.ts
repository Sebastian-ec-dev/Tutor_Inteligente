import { ClassSchedule, normalizeTimeString, timeToMinutes } from '../../../domain/entities/ClassSchedule';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassScheduleRepositoryPort } from '../../../domain/ports/ClassScheduleRepositoryPort';
import { SubjectRepositoryPort } from '../../../domain/ports/SubjectRepositoryPort';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateClassScheduleUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly subjectRepository: SubjectRepositoryPort,
    private readonly scheduleRepository: ClassScheduleRepositoryPort,
  ) {}

  async execute(input: {
    id: string;
    subjectId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }): Promise<ClassSchedule> {
    input.startTime = normalizeTimeString(input.startTime);
    input.endTime = normalizeTimeString(input.endTime);
    if (!TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime)) {
      throw new Error('Ingrese las horas con formato HH:MM, por ejemplo 08:30');
    }
    if (timeToMinutes(input.startTime) >= timeToMinutes(input.endTime)) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    const userId = await this.authRepository.getCurrentUserId();
    const [entries, subjects] = await Promise.all([
      this.scheduleRepository.listByUser(userId),
      this.subjectRepository.listByUser(userId),
    ]);

    const previous = entries.find((entry) => entry.id === input.id);
    if (!previous) throw new Error('El horario que desea editar ya no existe');

    const subject = subjects.find((item) => item.id === input.subjectId);
    if (!subject) throw new Error('Seleccione una materia válida');

    const updated: ClassSchedule = {
      ...previous,
      subjectId: subject.id,
      subjectName: subject.name,
      teacher: subject.teacher || null,
      color: subject.color || '#2563EB',
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    };

    return this.scheduleRepository.save(updated);
  }
}
