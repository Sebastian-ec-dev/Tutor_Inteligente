import { AuthSession, AuthSubscription } from '../../domain/entities/AuthSession';
import { AuthRepositoryPort, RegisterProfileInput } from '../../domain/ports/AuthRepositoryPort';
import { supabase } from './supabaseClient';

function mapSession(session: any): AuthSession {
  if (!session?.user) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  };
}

export class SupabaseAuthRepository implements AuthRepositoryPort {
  async login(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async register(email: string, password: string, profile?: RegisterProfileInput): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: profile?.displayName || null,
          university: profile?.university || null,
        },
      },
    });
    if (error) throw new Error(error.message);
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getCurrentUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    if (!data.user?.id) throw new Error('No estás autenticado');
    return data.user.id;
  }

  async getSession(): Promise<AuthSession> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return mapSession(data.session);
  }

  onAuthStateChange(callback: (session: AuthSession) => void): AuthSubscription {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(mapSession(session));
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }
}
