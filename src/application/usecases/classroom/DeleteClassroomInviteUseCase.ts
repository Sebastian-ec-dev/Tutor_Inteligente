import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class DeleteClassroomInviteUseCase {
  constructor(private readonly classroomRepository: ClassroomMemberRepositoryPort) {}

  async execute(inviteId: string): Promise<void> {
    if (!inviteId) throw new Error('No se encontró la invitación');
    await this.classroomRepository.deleteInvite(inviteId);
  }
}
