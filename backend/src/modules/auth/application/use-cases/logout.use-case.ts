import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_REPOSITORY } from '../ports/refresh-token.repository';
import type { RefreshTokenRepository } from '../ports/refresh-token.repository';

/** Revokes all refresh tokens for the user; cookies are cleared by the controller. */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.refreshTokens.deleteAllForUser(userId);
  }
}
