import {
  timestamp,
  uuid,
  varchar,
  pgTable,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';

/**
 * Per-institute lesson subjects (مواد) — managed entities, similar to lesson_categories.
 * Kept in a separate schema file to avoid circular imports between
 * class.schema.ts ↔ lesson.schema.ts.
 */
export const lessonSubjects = pgTable('lesson_subjects', {
  id: uuid('id').primaryKey(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  color: varchar('color', { length: 20 }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LessonSubjectRow = InferSelectModel<typeof lessonSubjects>;
