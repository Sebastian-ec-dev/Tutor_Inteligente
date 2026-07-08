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

async function getAuthenticatedUser() {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);

  const user = userData.user;
  if (!user) throw new Error('No estás autenticado');

  return user;
}

export class SupabaseProfileRepository implements ProfileRepositoryPort {
  async getCurrentProfile(): Promise<UserProfile> {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert({ email: user.email || null })
        .select(PROFILE_SELECT)
        .single();

      if (insertError) throw new Error(insertError.message);
      return mapProfile(inserted);
    }

    return mapProfile(data);
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const user = await getAuthenticatedUser();

    const payload = {
      email: user.email || null,
      display_name: input.displayName || null,
      university: input.university || null,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return mapProfile(data);

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(payload)
      .select(PROFILE_SELECT)
      .single();

    if (insertError) throw new Error(insertError.message);
    return mapProfile(inserted);
  }
}
