import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

/** Classes (حلقات) — tenant-owned (constitution II). */
export const classes = pgTable('classes', {
  id: uuid('id').primaryKey(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Class ↔ teacher M:N. The "exactly one supervisor per class" rule is enforced
 * at the database level with a partial unique index — application bugs cannot
 * produce two supervisors.
 */
export const classTeachers = pgTable(
  'class_teachers',
  {
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isSupervisor: boolean('is_supervisor').notNull().default(false),
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.classId, t.teacherId] }),
    uniqueIndex('one_supervisor_per_class')
      .on(t.classId)
      .where(sql`${t.isSupervisor} = true`),
  ],
);

/** Class ↔ student M:N (enrollment). */
export const classStudents = pgTable(
  'class_students',
  {
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] })],
);

export type ClassRow = InferSelectModel<typeof classes>;
