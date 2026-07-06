import { ClassroomRole } from '../../../domain/entities/ClassroomMember';
import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class UpdateClassroomMemberRoleUseCase {
  constructor(private readonly classroomRepository: ClassroomMemberRepositoryPort) {}

  async execute(input: { subjectId: string; memberUserId: string; role: Exclude<ClassroomRole, 'owner'> }): Promise<void> {
    if (!input.subjectId || !input.memberUserId) throw new Error('No se encontró el integrante');
    await this.classroomRepository.updateMemberRole(input);
  }
}
