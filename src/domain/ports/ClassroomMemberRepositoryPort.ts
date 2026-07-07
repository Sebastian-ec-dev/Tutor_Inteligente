import { ClassroomInvite, ClassroomMember, ClassroomRole, SubjectMembership } from '../entities/ClassroomMember';

export interface ClassroomMemberRepositoryPort {
  listMembers(subjectId: string): Promise<ClassroomMember[]>;
  listInvites(subjectId: string): Promise<ClassroomInvite[]>;
  inviteMember(input: {
    subjectId: string;
    invitedEmail: string;
    role: Exclude<ClassroomRole, 'owner'>;
    createdBy: string;
  }): Promise<ClassroomInvite>;
  updateMemberRole(input: {
    subjectId: string;
    memberUserId: string;
    role: Exclude<ClassroomRole, 'owner'>;
  }): Promise<void>;
  removeMember(input: { subjectId: string; memberUserId: string }): Promise<void>;
  deleteInvite(inviteId: string): Promise<void>;
  createJoinInvite(input: {
    subjectId: string;
    role: Exclude<ClassroomRole, 'owner'>;
    createdBy: string;
    maxUses?: number;
    inviteType: 'link' | 'qr';
  }): Promise<ClassroomInvite>;
  joinByToken(token: string): Promise<{ subjectId: string; role: ClassroomRole; message: string }>;
  listMemberships(userId: string): Promise<SubjectMembership[]>;
}
