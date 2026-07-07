import { ClassroomInvite, ClassroomRole } from '../../../domain/entities/ClassroomMember';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class CreateJoinInviteUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly classroomRepository: ClassroomMemberRepositoryPort,
  ) {}

  async execute(input: {
    subjectId: string;
    role?: Exclude<ClassroomRole, 'owner'>;
    maxUses?: number;
    inviteType?: 'link' | 'qr';
  }): Promise<ClassroomInvite> {
    if (!input.subjectId) throw new Error('No se encontró el aula para generar la invitación');

    const createdBy = await this.authRepository.getCurrentUserId();

    return this.classroomRepository.createJoinInvite({
      subjectId: input.subjectId,
      role: input.role || 'student',
      createdBy,
      maxUses: input.maxUses || 50,
      inviteType: input.inviteType || 'link',
    });
  }
}
