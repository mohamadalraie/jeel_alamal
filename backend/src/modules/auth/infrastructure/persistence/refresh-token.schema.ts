import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../../../users/infrastructure/persistence/user.schema';

/**
 * Refresh tokens, stored as SHA-256 hashes (the raw token only lives in the
 * httpOnly cookie). Rotation: each successful refresh deletes the used row and
 * inserts a new one (constitution IV).
 */
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
