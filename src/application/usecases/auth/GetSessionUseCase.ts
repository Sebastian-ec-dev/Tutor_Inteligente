import { AuthSession } from '../../../domain/entities/AuthSession';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';

export class GetSessionUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(): Promise<AuthSession> {
    return this.authRepository.getSession();
  }
}
