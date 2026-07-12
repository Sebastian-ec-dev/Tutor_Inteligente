import { UserProfile, UpdateProfileInput } from '../../domain/entities/Profile';
import { ProfileRepositoryPort } from '../../domain/ports/ProfileRepositoryPort';
import { supabase } from './supabaseClient';

const PROFILE_SELECT = 'id, email, display_name, university, created_at';

function mapProfile(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    university: row.university,
    createdAt: row.created_at,
  };
}

export class SupabaseProfileRepository implements ProfileRepositoryPort {
  async getCurrentProfile(userId: string): Promise<UserProfile> {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email || null;

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, email })
        .select(PROFILE_SELECT)
        .single();
      if (insertError) throw new Error(insertError.message);
      return mapProfile(inserted);
    }

    return mapProfile(data);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email || null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        display_name: input.displayName || null,
        university: input.university || null,
      })
      .select(PROFILE_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data);
  }
}
