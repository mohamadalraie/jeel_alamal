import { UserRole } from '../../../../shared/domain/user-role';

export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  instituteId: string | null;
}

/**
 * JWT signing/verification PORT. Keeps @nestjs/jwt out of the use-cases so the
 * token mechanism is swappable and login logic is unit-testable.
 */
export interface TokenSigner {
  signAccessToken(payload: AccessTokenPayload): Promise<string>;
  signRefreshToken(userId: string): Promise<string>;
  /** Returns the userId (sub) if valid, otherwise throws. */
  verifyRefreshToken(token: string): Promise<string>;
}
