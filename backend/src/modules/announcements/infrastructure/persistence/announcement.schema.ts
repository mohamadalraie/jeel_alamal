import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';
import { classes } from '../../../classes/infrastructure/persistence/class.schema';

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey(),
  instituteId: uuid('institute_id')
    .notNull()
    .references(() => institutes.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  targetHalkaId: uuid('target_halka_id').references(() => classes.id, {
    onDelete: 'cascade',
  }),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  targetTrack: varchar('target_track', { enum: ['all', 'regular', 'intensive'] }).default('all'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AnnouncementRow = InferSelectModel<typeof announcements>;
