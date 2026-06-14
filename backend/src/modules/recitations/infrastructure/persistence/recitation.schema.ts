import {
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

export const recitationRatingEnum = pgEnum('recitation_rating', [
  'excellent',
  'very_good',
  'good',
  'acceptable',
  'weak',
]);

/** A recitation (تسميع) session — spec 005. */
export const recitations = pgTable('recitations', {
  id: uuid('id').primaryKey(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  surahNumber: smallint('surah_number').notNull(),
  fromAyah: smallint('from_ayah').notNull(),
  toAyah: smallint('to_ayah').notNull(),
  rating: recitationRatingEnum('rating').notNull(),
  recitedBy: uuid('recited_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RecitationRow = InferSelectModel<typeof recitations>;
