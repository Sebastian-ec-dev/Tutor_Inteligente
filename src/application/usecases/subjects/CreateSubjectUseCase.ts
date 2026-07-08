import { Subject } from '../../../domain/entities/Subject';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { SubjectRepositoryPort } from '../../../domain/ports/SubjectRepositoryPort';

export type CreateSubjectInput =
  | string
  | {
      name: string;
      teacher?: string;
      description?: string;
      color?: string;
      icon?: string;
    };

export class CreateSubjectUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly subjectRepository: SubjectRepositoryPort,
  ) {}

  async execute(input: CreateSubjectInput): Promise<Subject> {
    const form = typeof input === 'string' ? { name: input } : input;
    const cleanName = form.name.trim();

    if (!cleanName) {
      throw new Error('Ingrese el nombre de la materia');
    }

    await this.authRepository.getCurrentUserId();
    return this.subjectRepository.create({
      name: cleanName,
      teacher: form.teacher?.trim() || undefined,
      description: form.description?.trim() || undefined,
      color: form.color || '#2563EB',
      icon: form.icon || '📚',
    });
  }
}
