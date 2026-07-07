import { ClassroomRole } from '../../../domain/entities/ClassroomMember';
import { ClassroomMemberRepositoryPort } from '../../../domain/ports/ClassroomMemberRepositoryPort';

export class JoinSubjectByTokenUseCase {
  constructor(private readonly classroomRepository: ClassroomMemberRepositoryPort) {}

  async execute(tokenOrLink: string): Promise<{ subjectId: string; role: ClassroomRole; message: string }> {
    const raw = tokenOrLink.trim();
    if (!raw) throw new Error('Ingresa o escanea un enlace de invitación');

    const token = extractToken(raw);
    if (!token) throw new Error('El enlace o QR no contiene un token válido');

    return this.classroomRepository.joinByToken(token);
  }
}

function extractToken(value: string): string | null {
  const queryToken = value.match(/[?&]token=([^&]+)/)?.[1];
  if (queryToken) return decodeURIComponent(queryToken);

  const pathToken = value.match(/\/join\/([^/?#]+)/)?.[1];
  if (pathToken) return decodeURIComponent(pathToken);

  if (/^[a-zA-Z0-9_-]{12,}$/.test(value)) return value;

  return null;
}
