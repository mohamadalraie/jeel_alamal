import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { Actor } from '../../shared/application/actor';
import type { UserRole } from '../../shared/domain/user-role';

interface AccessClaims {
  sub: string;
  role: UserRole;
  instituteId: string | null;
}

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Global authentication guard (deny by default, constitution III). Verifies
 * the JWT from the httpOnly cookie (or an Authorization: Bearer header for
 * API tooling) and attaches the Actor to the request. Endpoints opt OUT with
 * @Public() — never the other way around.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { actor: Actor }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.actor = {
      userId: claims.sub,
      role: claims.role,
      instituteId: claims.instituteId ?? null,
    };
    return true;
  }

  private extractToken(request: Request): string | null {
    const cookies = request.cookies as Record<string, string> | undefined;
    if (cookies?.[ACCESS_TOKEN_COOKIE]) return cookies[ACCESS_TOKEN_COOKIE];
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }
}
