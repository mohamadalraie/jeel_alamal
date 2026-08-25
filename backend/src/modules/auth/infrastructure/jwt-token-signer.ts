import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type {
  AccessTokenPayload,
  TokenSigner,
} from '../application/ports/token-signer.port';

type ExpiresIn = JwtSignOptions['expiresIn'];

/**
 * @nestjs/jwt adapter for the TokenSigner port. Access and refresh tokens use
 * SEPARATE secrets so one kind can never be replayed as the other.
 */
@Injectable()
export class JwtTokenSigner implements TokenSigner {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });
  }

  signRefreshToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, typ: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  async verifyRefreshToken(token: string): Promise<string> {
    const payload = await this.jwt.verifyAsync<{ sub: string; typ?: string }>(
      token,
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
    );
    if (payload.typ !== 'refresh') {
      throw new Error('Not a refresh token');
    }
    return payload.sub;
  }
}
