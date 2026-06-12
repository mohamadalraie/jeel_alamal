import { pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { institutes } from './institute.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

/** Manager ↔ institute M:N — a manager may run many institutes (spec 001). */
export const managerInstitutes = pgTable(
  'manager_institutes',
  {
    managerId: uuid('manager_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.managerId, t.instituteId] })],
);
