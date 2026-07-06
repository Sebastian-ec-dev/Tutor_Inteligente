import { AuthRepositoryPort, RegisterProfileInput } from '../../../domain/ports/AuthRepositoryPort';

export class RegisterUseCase {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  async execute(email: string, password: string, profile?: RegisterProfileInput): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      throw new Error('Llene todos los campos obligatorios');
    }

    if (!cleanEmail.includes('@')) {
      throw new Error('Ingrese un correo electrónico válido');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    await this.authRepository.register(cleanEmail, password, {
      displayName: profile?.displayName?.trim(),
      university: profile?.university?.trim(),
    });
  }
}
