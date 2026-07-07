import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class RemoveClassroomMemberUseCase {
  constructor(private readonly classroomRepository: ClassroomMemberRepositoryPort) {}

  async execute(input: { subjectId: string; memberUserId: string }): Promise<void> {
    if (!input.subjectId || !input.memberUserId) throw new Error('No se encontró el integrante');
    await this.classroomRepository.removeMember(input);
  }
}
