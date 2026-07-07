import { Subject } from '../../../domain/entities/Subject';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { SubjectRepositoryPort } from '../../../domain/ports/SubjectRepositoryPort';

export class ListSubjectsUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly subjectRepository: SubjectRepositoryPort,
  ) {}

  async execute(): Promise<Subject[]> {
    const userId = await this.authRepository.getCurrentUserId();
    return this.subjectRepository.listByUser(userId);
  }
}
