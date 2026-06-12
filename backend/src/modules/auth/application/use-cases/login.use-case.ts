import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { PASSWORD_HASHER } from '../../../users/application/ports/password-hasher.port';
import type { PasswordHasher } from '../../../users/application/ports/password-hasher.port';
import { TOKEN_SIGNER } from '../ports/token-signer.port';
import type { TokenSigner } from '../ports/token-signer.port';
import { REFRESH_TOKEN_REPOSITORY } from '../ports/refresh-token.repository';
import type { RefreshTokenRepository } from '../ports/refresh-token.repository';
import { Username } from '../../../users/domain/value-objects/username.vo';
import { UnauthorizedError } from '../../../../shared/domain/domain.error';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';

export interface LoginResult {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
}

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/**
 * Username + password login for ALL roles (spec 001). Returns an access token
 * and a refresh token; the controller turns them into httpOnly cookies. The
 * same generic error is returned for unknown user and wrong password so the
 * endpoint doesn't leak which usernames exist.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_SIGNER) private readonly tokens: TokenSigner,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(usernameRaw: string, password: string): Promise<LoginResult> {
    let username: Username;
    try {
      username = Username.create(usernameRaw);
    } catch {
      throw new UnauthorizedError('Invalid username or password');
    }

    const user = await this.users.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const valid = await this.hasher.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      role: user.role,
      instituteId: user.instituteId,
    });
    const refreshToken = await this.tokens.signRefreshToken(user.id);
    await this.refreshTokens.save(
      user.id,
      hashToken(refreshToken),
      new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    );

    return { user: UserResponseDto.fromDomain(user), accessToken, refreshToken };
  }
}
