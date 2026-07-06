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
  listMemberships(userId: string): Promise<SubjectMembership[]>;
}
