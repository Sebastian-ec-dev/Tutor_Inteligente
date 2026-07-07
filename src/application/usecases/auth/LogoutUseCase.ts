import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';

export class LogoutUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(): Promise<void> {
    await this.authRepository.logout();
  }
}
