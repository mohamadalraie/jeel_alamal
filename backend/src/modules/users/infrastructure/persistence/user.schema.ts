import {
  date,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';

/**
 * Auth identity + shared profile for every role (spec 001). Login is by unique
 * username. `institute_id` is the home institute for teachers/students; null
 * for super_admin and managers (managers are assigned via manager_institutes).
 */
export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'institute_manager',
  'teacher',
  'student',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  birthDate: date('birth_date'),
  phone: varchar('phone', { length: 30 }),
  schoolGrade: varchar('school_grade', { length: 50 }),
  instituteId: uuid('institute_id').references(() => institutes.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = InferSelectModel<typeof users>;
