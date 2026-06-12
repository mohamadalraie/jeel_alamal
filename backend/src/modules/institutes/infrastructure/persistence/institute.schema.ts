import { pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

/** The tenant table. Everything tenant-owned references institutes.id. */
export const institutes = pgTable('institutes', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  place: varchar('place', { length: 200 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InstituteRow = InferSelectModel<typeof institutes>;
