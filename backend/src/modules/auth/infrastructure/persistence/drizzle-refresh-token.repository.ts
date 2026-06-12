import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import type { RefreshTokenRepository } from '../../application/ports/refresh-token.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { refreshTokens } from './refresh-token.schema';

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.insert(refreshTokens).values({
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    });
  }

  /** Single-use consumption: delete the row and return its owner (rotation). */
  async consume(tokenHash: string): Promise<string | null> {
    const deleted = await this.db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: refreshTokens.userId });
    return deleted[0]?.userId ?? null;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }
}
