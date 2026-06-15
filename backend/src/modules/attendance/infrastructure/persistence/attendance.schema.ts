import {
  date,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';
import { classes } from '../../../classes/infrastructure/persistence/class.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'present',
  'absent',
  'justified',
  'late',
]);

/** One attendance-taking event for a class on a date — spec 007. */
export const attendanceSessions = pgTable(
  'attendance_sessions',
  {
    id: uuid('id').primaryKey(),
    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    date: date('date').notNull(), // 'YYYY-MM-DD'
    takenBy: uuid('taken_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('one_session_per_class_per_day').on(t.classId, t.date)],
);

/** One student's status within a session. */
export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => attendanceSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: attendanceStatusEnum('status').notNull(),
});

export type AttendanceSessionRow = InferSelectModel<typeof attendanceSessions>;
export type AttendanceRecordRow = InferSelectModel<typeof attendanceRecords>;
