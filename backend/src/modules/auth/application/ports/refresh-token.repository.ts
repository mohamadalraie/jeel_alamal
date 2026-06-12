export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

/**
 * Persistence PORT for refresh-token rotation. Only SHA-256 hashes are stored;
 * the raw token exists solely in the httpOnly cookie.
 */
export interface RefreshTokenRepository {
  save(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Returns the owning userId if the hash exists and is unexpired. */
  consume(tokenHash: string): Promise<string | null>;
  deleteAllForUser(userId: string): Promise<void>;
}
