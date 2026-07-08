import { UpdateProfileInput, UserProfile } from '../entities/Profile';

export interface ProfileRepositoryPort {
  getCurrentProfile(): Promise<UserProfile>;
  updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
}
