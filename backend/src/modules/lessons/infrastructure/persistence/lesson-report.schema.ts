import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { users } from '../../../users/infrastructure/persistence/user.schema';
import { lessonClasses } from './lesson.schema';

/** Webhook dispatch status for post-lesson reports (spec 012). */
export const lessonReportWebhookStatusEnum = pgEnum(
  'lesson_report_webhook_status',
  ['pending', 'sent', 'failed', 'disabled'],
);

/**
 * Detailed lesson reports submitted by teachers upon session completion.
 * Enforces one report per class binding (1:1 with lesson_classes).
 */
export const lessonReports = pgTable('lesson_reports', {
  id: uuid('id').primaryKey(),
  lessonClassId: uuid('lesson_class_id')
    .notNull()
    .unique()
    .references(() => lessonClasses.id, { onDelete: 'cascade' }),
  mainIdeas: text('main_ideas').notNull(),
  positives: text('positives'),
  negatives: text('negatives'),
  teacherNotes: text('teacher_notes'),
  submittedBy: uuid('submitted_by')
    .notNull()
    .references(() => users.id),
  webhookStatus: lessonReportWebhookStatusEnum('webhook_status')
    .notNull()
    .default('pending'),
  webhookError: text('webhook_error'),
  webhookSentAt: timestamp('webhook_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LessonReportRow = InferSelectModel<typeof lessonReports>;
