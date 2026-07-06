import { AuthSession, AuthSubscription } from '../entities/AuthSession';

export type RegisterProfileInput = {
  displayName?: string;
  university?: string;
};

export interface AuthRepositoryPort {
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, profile?: RegisterProfileInput): Promise<void>;
  logout(): Promise<void>;
  getCurrentUserId(): Promise<string>;
  getSession(): Promise<AuthSession>;
  onAuthStateChange(callback: (session: AuthSession) => void): AuthSubscription;
}
