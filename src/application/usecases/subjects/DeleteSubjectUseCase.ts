import { SubjectRepositoryPort } from '../../../domain/ports/SubjectRepositoryPort';

export class DeleteSubjectUseCase {
  constructor(private readonly subjectRepository: SubjectRepositoryPort) {}

  async execute(subjectId: string): Promise<void> {
    if (!subjectId) throw new Error('No se encontró la materia');
    await this.subjectRepository.delete(subjectId);
  }
}
