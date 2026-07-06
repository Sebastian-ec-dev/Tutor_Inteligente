import { ClassroomInvite, ClassroomMember } from '../../../domain/entities/ClassroomMember';
import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class ListClassroomMembersUseCase {
  constructor(private readonly classroomRepository: ClassroomMemberRepositoryPort) {}

  async execute(subjectId: string): Promise<{ members: ClassroomMember[]; invites: ClassroomInvite[] }> {
    if (!subjectId) throw new Error('No se encontró el aula');
    const [members, invites] = await Promise.all([
      this.classroomRepository.listMembers(subjectId),
      this.classroomRepository.listInvites(subjectId),
    ]);
    return { members, invites };
  }
}
