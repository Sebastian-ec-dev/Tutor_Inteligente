import { supabase } from './supabaseClient';

export type UserPreferences = {
  themeMode: 'light' | 'dark';
  onboardingSeen: boolean;
};

export async function getCloudUserPreferences(): Promise<UserPreferences | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('theme_mode, onboarding_seen')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    themeMode: data.theme_mode === 'dark' ? 'dark' : 'light',
    onboardingSeen: Boolean(data.onboarding_seen),
  };
}

export async function saveCloudUserPreferences(
  patch: Partial<UserPreferences>,
): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return;
  const payload: Record<string, unknown> = {
    user_id: userData.user.id,
    updated_at: new Date().toISOString(),
  };
  if (patch.themeMode !== undefined) payload.theme_mode = patch.themeMode;
  if (patch.onboardingSeen !== undefined) payload.onboarding_seen = patch.onboardingSeen;
  const { error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
