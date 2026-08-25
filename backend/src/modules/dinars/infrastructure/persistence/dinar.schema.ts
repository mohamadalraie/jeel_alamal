import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { institutes } from '../../../institutes/infrastructure/persistence/institute.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

export const dinarContextEnum = pgEnum('dinar_context', [
  'lesson',
  'recitation',
  'attendance',
  'general',
]);

export const dinarSourceTypeEnum = pgEnum('dinar_source_type', [
  'manual_rule',
  'exceptional',
  'attendance',
  'recitation',
]);

/** Dinar rules (قواعد الدنانير) — the dynamic reward definitions (spec 010). */
export const dinarRules = pgTable(
  'dinar_rules',
  {
    id: uuid('id').primaryKey(),
    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    amount: integer('amount').notNull(), // signed, non-zero (enforced in domain)
    context: dinarContextEnum('context').notNull(),
    trigger: text('trigger').notNull(), // 'manual' | 'automatic'
    systemKey: text('system_key'), // set for the 9 seeded system rules
    isActive: boolean('is_active').notNull().default(true),
    isProtected: boolean('is_protected').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('one_system_rule_per_key_per_institute')
      .on(t.instituteId, t.systemKey)
      .where(sql`${t.systemKey} is not null`),
    index('dinar_rules_by_institute').on(t.instituteId),
  ],
);

/** Dinar transactions (حركات الدنانير) — the immutable-for-manual ledger. */
export const dinarTransactions = pgTable(
  'dinar_transactions',
  {
    id: uuid('id').primaryKey(),
    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    context: dinarContextEnum('context').notNull(),
    sourceType: dinarSourceTypeEnum('source_type').notNull(),
    ruleId: uuid('rule_id').references(() => dinarRules.id, {
      onDelete: 'restrict',
    }),
    ruleName: text('rule_name'), // snapshot at award time
    reason: text('reason'), // required for exceptional
    sourceRef: text('source_ref'), // attendance `classId:date`; recitation id
    awardedBy: uuid('awarded_by').references(() => users.id),
    reversesId: uuid('reverses_id').references(
      (): AnyPgColumn => dinarTransactions.id,
      { onDelete: 'set null' },
    ),
    reversedAt: timestamp('reversed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Idempotency for automatic projections: one per source per student.
    uniqueIndex('one_projection_per_source_student')
      .on(t.sourceType, t.sourceRef, t.studentId)
      .where(sql`${t.sourceRef} is not null`),
    index('dinar_txn_by_student').on(t.instituteId, t.studentId),
    index('dinar_txn_by_institute').on(t.instituteId),
  ],
);

export type DinarRuleRow = InferSelectModel<typeof dinarRules>;
export type DinarTransactionRow = InferSelectModel<typeof dinarTransactions>;
