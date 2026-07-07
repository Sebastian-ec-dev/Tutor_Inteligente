import { AuthSession, AuthSubscription } from '../../../domain/entities/AuthSession';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';

export class ObserveAuthStateUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  execute(callback: (session: AuthSession) => void): AuthSubscription {
    return this.authRepository.onAuthStateChange(callback);
  }
}
