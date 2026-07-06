import { SubjectMembership } from '../../../domain/entities/ClassroomMember';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class ListMyMembershipsUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly classroomRepository: ClassroomMemberRepositoryPort,
  ) {}

  async execute(): Promise<SubjectMembership[]> {
    const userId = await this.authRepository.getCurrentUserId();
    return this.classroomRepository.listMemberships(userId);
  }
}
