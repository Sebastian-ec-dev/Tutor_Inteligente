import {
  ClassroomInvite,
  ClassroomMember,
  ClassroomRole,
  SubjectMembership,
} from "../../domain/entities/ClassroomMember";
import { ClassroomMemberRepositoryPort } from "../../domain/ports/ClassroomMemberRepositoryPort";
import { supabase } from "./supabaseClient";

function mapMember(row: any, profile?: any): ClassroomMember {
  const resolvedProfile =
    profile || (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles);
  return {
    id: row.id,
    subjectId: row.subject_id,
    userId: row.user_id,
    role: row.role,
    email: resolvedProfile?.email || null,
    displayName: resolvedProfile?.display_name || null,
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
    token: row.token || null,
    inviteType: row.invite_type || "email",
    maxUses: row.max_uses ?? null,
    usesCount: row.uses_count ?? null,
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
  };
}

const INVITE_SELECT =
  "id, subject_id, invited_email, role, status, created_by, token, invite_type, max_uses, uses_count, expires_at, created_at";
const INVITE_SELECT_LEGACY =
  "id, subject_id, invited_email, role, status, created_by, created_at";
const MEMBER_SELECT = "id, subject_id, user_id, role, created_at";
const MEMBER_WITH_PROFILE_SELECT = `${MEMBER_SELECT}, profiles:user_id(email, display_name)`;

function isSchemaCacheError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return (
    message.includes("schema cache") ||
    message.includes("relationship") ||
    message.includes("Could not find")
  );
}

export class SupabaseClassroomMemberRepository implements ClassroomMemberRepositoryPort {
  async listMembers(subjectId: string): Promise<ClassroomMember[]> {
    const { data, error } = await supabase
      .from("subject_members")
      .select(MEMBER_WITH_PROFILE_SELECT)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true });

    if (!error) return (data || []).map((row: any) => mapMember(row));
    if (!isSchemaCacheError(error)) throw new Error(error.message);

    // Fallback: no depende de una relación PostgREST entre subject_members.user_id y profiles.id.
    const { data: membersData, error: membersError } = await supabase
      .from("subject_members")
      .select(MEMBER_SELECT)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: true });

    if (membersError) throw new Error(membersError.message);

    const userIds = (membersData || [])
      .map((row: any) => row.user_id)
      .filter(Boolean);
    const { data: profilesData } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", userIds)
      : { data: [] as any[] };

    const profilesById = new Map<string, any>();
    (profilesData || []).forEach((profile: any) =>
      profilesById.set(profile.id, profile),
    );

    return (membersData || []).map((row: any) =>
      mapMember(row, profilesById.get(row.user_id)),
    );
  }

  async listInvites(subjectId: string): Promise<ClassroomInvite[]> {
    const { data, error } = await supabase
      .from("subject_invites")
      .select(INVITE_SELECT)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (!error) return (data || []).map(mapInvite);
    if (!isSchemaCacheError(error)) throw new Error(error.message);

    const { data: legacyData, error: legacyError } = await supabase
      .from("subject_invites")
      .select(INVITE_SELECT_LEGACY)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (legacyError) throw new Error(legacyError.message);
    return (legacyData || []).map(mapInvite);
  }

  async inviteMember(input: {
    subjectId: string;
    invitedEmail: string;
    role: Exclude<ClassroomRole, "owner">;
    createdBy: string;
  }): Promise<ClassroomInvite> {
    const payload = {
      subject_id: input.subjectId,
      invited_email: input.invitedEmail,
      role: input.role,
      created_by: input.createdBy,
      status: "pending",
      invite_type: "email",
      max_uses: 1,
      uses_count: 0,
    };

    const { data, error } = await supabase
      .from("subject_invites")
      .insert(payload)
      .select(INVITE_SELECT)
      .single();

    if (!error) return mapInvite(data);
    if (!isSchemaCacheError(error)) throw new Error(error.message);

    const { data: legacyData, error: legacyError } = await supabase
      .from("subject_invites")
      .insert({
        subject_id: input.subjectId,
        invited_email: input.invitedEmail,
        role: input.role,
        created_by: input.createdBy,
        status: "pending",
      })
      .select(INVITE_SELECT_LEGACY)
      .single();

    if (legacyError)
      throw new Error(
        `${legacyError.message}. Ejecuta supabase/sql/002_fix_schema_cache_members_invites.sql para habilitar QR/enlace.`,
      );
    return mapInvite(legacyData);
  }

  async createJoinInvite(input: {
    subjectId: string;
    role: Exclude<ClassroomRole, "owner">;
    createdBy: string;
    maxUses?: number;
    inviteType: "link" | "qr";
  }): Promise<ClassroomInvite> {
    const { data, error } = await supabase
      .from("subject_invites")
      .insert({
        subject_id: input.subjectId,
        invited_email: "enlace-compartido",
        role: input.role,
        created_by: input.createdBy,
        status: "pending",
        invite_type: input.inviteType,
        max_uses: input.maxUses || 50,
        uses_count: 0,
      })
      .select(INVITE_SELECT)
      .single();

    if (error) {
      if (isSchemaCacheError(error)) {
        throw new Error(
          "A tu base de datos le faltan columnas de invitación para QR/enlace. Ejecuta supabase/sql/002_fix_schema_cache_members_invites.sql en Supabase SQL Editor y vuelve a abrir la app.",
        );
      }
      throw new Error(error.message);
    }
    return mapInvite(data);
  }

  async joinByToken(
    token: string,
  ): Promise<{ subjectId: string; role: ClassroomRole; message: string }> {
    const { data, error } = await supabase.rpc("join_subject_by_invite_token", {
      p_token: token,
    });

    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    return {
      subjectId: row?.r_subject_id || row?.subject_id,
      role: row?.r_joined_role || row?.joined_role || "student",
      message:
        row?.r_message || row?.message || "Te uniste correctamente al aula",
    };
  }

  async updateMemberRole(input: {
    subjectId: string;
    memberUserId: string;
    role: Exclude<ClassroomRole, "owner">;
  }): Promise<void> {
    const { error } = await supabase
      .from("subject_members")
      .update({ role: input.role })
      .eq("subject_id", input.subjectId)
      .eq("user_id", input.memberUserId)
      .neq("role", "owner");

    if (error) throw new Error(error.message);
  }

  async removeMember(input: {
    subjectId: string;
    memberUserId: string;
  }): Promise<void> {
    const { error } = await supabase
      .from("subject_members")
      .delete()
      .eq("subject_id", input.subjectId)
      .eq("user_id", input.memberUserId)
      .neq("role", "owner");

    if (error) throw new Error(error.message);
  }

  async deleteInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from("subject_invites")
      .delete()
      .eq("id", inviteId);

    if (error) throw new Error(error.message);
  }

  async listMemberships(userId: string): Promise<SubjectMembership[]> {
    const { data, error } = await supabase
      .from("subject_members")
      .select("role, subjects:subject_id(id, name, color)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => {
      const subject = Array.isArray(row.subjects)
        ? row.subjects[0]
        : row.subjects;
      return {
        subjectId: subject?.id,
        subjectName: subject?.name || "Materia sin nombre",
        color: subject?.color || null,
        role: row.role,
      };
    });
  }
}
