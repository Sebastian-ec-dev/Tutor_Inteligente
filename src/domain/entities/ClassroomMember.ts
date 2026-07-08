export type ClassroomRole = 'owner' | 'admin' | 'teacher' | 'student';

export const CLASSROOM_ROLE_LABELS: Record<ClassroomRole, string> = {
  owner: 'Creador',
  admin: 'Administrador',
  teacher: 'Maestro',
  student: 'Estudiante',
};

export type ClassroomMember = {
  id: string;
  subjectId: string;
  accountId: string;
  memberRole: ClassroomRole;
  email?: string | null;
  displayName?: string | null;
  createdAt?: string | null;
};

export type ClassroomInvite = {
  id: string;
  subjectId: string;
  invitedEmail: string;
  role: Exclude<ClassroomRole, 'owner'>;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdBy: string;
  token?: string | null;
  inviteType?: 'email' | 'link' | 'qr';
  maxUses?: number | null;
  usesCount?: number | null;
  expiresAt?: string | null;
  createdAt?: string | null;
};

export type SubjectMembership = {
  subjectId: string;
  subjectName: string;
  role: ClassroomRole;
  color?: string | null;
};
