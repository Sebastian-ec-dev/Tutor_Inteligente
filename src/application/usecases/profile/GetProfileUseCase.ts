import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { ProfileRepositoryPort } from '../../../domain/ports/ProfileRepositoryPort';
import { UserProfile } from '../../../domain/entities/Profile';

export class GetProfileUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly profileRepository: ProfileRepositoryPort,
  ) {}

  async execute(): Promise<UserProfile> {
    await this.authRepository.getCurrentUserId();
    return this.profileRepository.getCurrentProfile();
  }
}
