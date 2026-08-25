import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { PASSWORD_HASHER } from '../../../users/application/ports/password-hasher.port';
import type { PasswordHasher } from '../../../users/application/ports/password-hasher.port';
import type { Actor } from '../../../../shared/application/actor';
import {
  NotFoundError,
  UnauthorizedError,
} from '../../../../shared/domain/domain.error';

/**
 * Allows any authenticated user to change their own password by providing the
 * correct current password first (prevents account takeover if a session is left
 * open on a shared device).
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(
    actor: Actor,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(actor.userId);
    if (!user) throw new NotFoundError('User not found');

    const valid = await this.hasher.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const newHash = await this.hasher.hash(newPassword);
    user.changePassword(newHash);
    await this.users.save(user);
  }
}
