import { Subject } from '../../../domain/entities/Subject';
import { SubjectRepositoryPort } from '../../../domain/ports/SubjectRepositoryPort';

export class UpdateSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepositoryPort) {}

  async execute(input: {
    id: string;
    name: string;
    teacher?: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<Subject> {
    const cleanName = input.name.trim();
    if (!cleanName) throw new Error('Ingrese el nombre de la materia');

    return this.subjectRepository.update({
      id: input.id,
      name: cleanName,
      teacher: input.teacher?.trim() || undefined,
      description: input.description?.trim() || undefined,
      color: input.color || '#2563EB',
      icon: input.icon || '📚',
    });
  }
}
