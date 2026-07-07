import { ClassroomInvite, ClassroomRole } from '../../../domain/entities/ClassroomMember';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class InviteClassroomMemberUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly classroomRepository: ClassroomMemberRepositoryPort,
  ) {}

  async execute(input: {
    subjectId: string;
    invitedEmail: string;
    role: Exclude<ClassroomRole, 'owner'>;
  }): Promise<ClassroomInvite> {
    const email = input.invitedEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new Error('Ingrese un correo válido');
    const createdBy = await this.authRepository.getCurrentUserId();

    return this.classroomRepository.inviteMember({
      subjectId: input.subjectId,
      invitedEmail: email,
      role: input.role,
      createdBy,
    });
  }
}
