import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ProfileRepositoryPort } from '../../../domain/ports/ProfileRepositoryPort';
import { UpdateProfileInput, UserProfile } from '../../../domain/entities/Profile';

export class UpdateProfileUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UserProfile> {
    await this.authRepository.getCurrentUserId();
    return this.profileRepository.updateProfile({
      displayName: input.displayName?.trim() || undefined,
      university: input.university?.trim() || undefined,
    });
  }
}
