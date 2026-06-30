import {
  date,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';
import { classes } from '../../../classes/infrastructure/persistence/class.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

/** A program entry is a normal lesson or a Quran-recitation marker (spec 008). */
export const lessonKindEnum = pgEnum('lesson_kind', ['lesson', 'recitation']);

/** A lesson source is an external link, an uploaded image, or an uploaded pdf. */
export const lessonSourceKindEnum = pgEnum('lesson_source_kind', [
  'link',
  'image',
  'pdf',
]);

/** Dynamic, per-institute lesson categories (name + color). */
export const lessonCategories = pgTable('lesson_categories', {
  id: uuid('id').primaryKey(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The shared lesson definition — stored ONCE even when scheduled for several
 * classes. Per-class bindings (and the assigned teacher) live in lesson_classes.
 */
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id, { onDelete: 'cascade' }),
  kind: lessonKindEnum('kind').notNull().default('lesson'),
  name: varchar('name', { length: 200 }), // null for recitation entries
  description: text('description'),
  categoryId: uuid('category_id').references(() => lessonCategories.id, {
    onDelete: 'set null',
  }),
  date: date('date').notNull(), // 'YYYY-MM-DD'
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Attachments/references for a lesson (link | image | pdf), each with a note. */
export const lessonSources = pgTable('lesson_sources', {
  id: uuid('id').primaryKey(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  kind: lessonSourceKindEnum('kind').notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  description: varchar('description', { length: 300 }),
  sort: smallint('sort').notNull().default(0),
});

/**
 * The per-class binding of a lesson — its OWN id, plus the teacher assigned to
 * give that lesson to that class. Many classes can share one lesson definition.
 */
export const lessonClasses = pgTable(
  'lesson_classes',
  {
    id: uuid('id').primaryKey(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id),
    sort: smallint('sort').notNull().default(0), // order within the class's day
  },
  (t) => [uniqueIndex('one_lesson_per_class').on(t.lessonId, t.classId)],
);

export type LessonCategoryRow = InferSelectModel<typeof lessonCategories>;
export type LessonRow = InferSelectModel<typeof lessons>;
export type LessonSourceRow = InferSelectModel<typeof lessonSources>;
export type LessonClassRow = InferSelectModel<typeof lessonClasses>;
