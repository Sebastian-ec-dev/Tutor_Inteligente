import { UpdateProfileInput, UserProfile } from '../entities/Profile';

export interface ProfileRepositoryPort {
  getCurrentProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile>;
}
