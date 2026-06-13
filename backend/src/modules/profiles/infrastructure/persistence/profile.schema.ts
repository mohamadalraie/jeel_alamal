import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../../../users/infrastructure/persistence/user.schema';

/** المعاهد والدورات الشرعية a teacher joined (spec 002). */
export const teacherCertifications = pgTable('teacher_certifications', {
  id: uuid('id').primaryKey(),
  teacherId: uuid('teacher_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Staff notes about a student; never shown to students (spec 002). */
export const studentNotes = pgTable('student_notes', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
