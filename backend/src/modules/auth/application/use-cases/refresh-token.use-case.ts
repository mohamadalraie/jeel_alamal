import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { TOKEN_SIGNER } from '../ports/token-signer.port';
import type { TokenSigner } from '../ports/token-signer.port';
import { REFRESH_TOKEN_REPOSITORY } from '../ports/refresh-token.repository';
import type { RefreshTokenRepository } from '../ports/refresh-token.repository';
import { UnauthorizedError } from '../../../../shared/domain/domain.error';
import {
  LoginResult,
  REFRESH_TOKEN_TTL_MS,
  hashToken,
} from './login.use-case';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';

/**
 * Refresh-token ROTATION (constitution IV): the presented token is consumed
 * (single use); a new access+refresh pair is issued. A token that is valid JWT
 * but absent from the store was already used or revoked → reject.
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SIGNER) private readonly tokens: TokenSigner,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(refreshToken: string): Promise<LoginResult> {
    let userId: string;
    try {
      userId = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const ownerId = await this.refreshTokens.consume(hashToken(refreshToken));
    if (!ownerId || ownerId !== userId) {
      throw new UnauthorizedError('Refresh token is no longer valid');
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Account no longer exists');
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      role: user.role,
      instituteId: user.instituteId,
    });
    const newRefreshToken = await this.tokens.signRefreshToken(user.id);
    await this.refreshTokens.save(
      user.id,
      hashToken(newRefreshToken),
      new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    );

    return {
      user: UserResponseDto.fromDomain(user),
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
