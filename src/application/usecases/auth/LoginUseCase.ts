import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';

export class LoginUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(email: string, password: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      throw new Error('Llene todos los campos');
    }

    if (!cleanEmail.includes('@')) {
      throw new Error('Ingrese un correo electrónico válido');
    }

    await this.authRepository.login(cleanEmail, password);
  }
}
