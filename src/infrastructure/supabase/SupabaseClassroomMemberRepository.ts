import {
  ClassroomInvite,
  ClassroomMember,
  ClassroomRole,
  SubjectMembership,
} from '../../domain/entities/ClassroomMember';
import { ClassroomMemberRepositoryPort } from '../../domain/ports/ClassroomMemberRepositoryPort';
import { supabase } from './supabaseClient';

function mapMember(row: any): ClassroomMember {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    subjectId: row.subject_id,
    userId: row.user_id,
    role: row.role,
    email: profile?.email || null,
    displayName: profile?.display_name || null,
    createdAt: row.created_at,
  };
}

function mapInvite(row: any): ClassroomInvite {
  return {
    id: row.id,
    subjectId: row.subject_id,
    invitedEmail: row.invited_email,
    role: row.role,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class SupabaseClassroomMemberRepository implements ClassroomMemberRepositoryPort {
  async listMembers(subjectId: string): Promise<ClassroomMember[]> {
    const { data, error } = await supabase
      .from('subject_members')
      .select('id, subject_id, user_id, role, created_at, profiles:user_id(email, display_name)')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapMember);
  }

  async listInvites(subjectId: string): Promise<ClassroomInvite[]> {
    const { data, error } = await supabase
      .from('subject_invites')
      .select('id, subject_id, invited_email, role, status, created_by, created_at')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapInvite);
  }

  async inviteMember(input: {
    subjectId: string;
    invitedEmail: string;
    role: Exclude<ClassroomRole, 'owner'>;
    createdBy: string;
  }): Promise<ClassroomInvite> {
    const { data, error } = await supabase
      .from('subject_invites')
      .insert({
        subject_id: input.subjectId,
        invited_email: input.invitedEmail,
        role: input.role,
        created_by: input.createdBy,
        status: 'pending',
      })
      .select('id, subject_id, invited_email, role, status, created_by, created_at')
      .single();

    if (error) throw new Error(error.message);
    return mapInvite(data);
  }

  async updateMemberRole(input: {
    subjectId: string;
    memberUserId: string;
    role: Exclude<ClassroomRole, 'owner'>;
  }): Promise<void> {
    const { error } = await supabase
      .from('subject_members')
      .update({ role: input.role })
      .eq('subject_id', input.subjectId)
      .eq('user_id', input.memberUserId)
      .neq('role', 'owner');

    if (error) throw new Error(error.message);
  }

  async listMemberships(userId: string): Promise<SubjectMembership[]> {
    const { data, error } = await supabase
      .from('subject_members')
      .select('role, subjects:subject_id(id, name, color)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => {
      const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
      return {
        subjectId: subject?.id,
        subjectName: subject?.name || 'Materia sin nombre',
        color: subject?.color || null,
        role: row.role,
      };
    });
  }
}
