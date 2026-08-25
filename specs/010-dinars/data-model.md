# Data Model — Dinars (نظام الدنانير)

Two tables in a new module `backend/src/modules/dinars/infrastructure/persistence/dinar.schema.ts`,
plus two Postgres enums. Migration `0005_dinars.sql` (generated, reviewed, committed).

---

## Enums

```
dinar_context      = 'lesson' | 'recitation' | 'attendance' | 'general'
dinar_source_type  = 'manual_rule' | 'exceptional' | 'attendance' | 'recitation'
```

- `context` = where the dinar belongs (display/filter). Manual awards from a profile
  use `general`; from the live lesson use `lesson`; a manual recitation rule uses
  `recitation`.
- `source_type` = behaviour class. `manual_rule`/`exceptional` → immutable ledger;
  `attendance`/`recitation` → projections reconciled by natural key.

(Attendance statuses and recitation ratings reuse the **existing** enums
`attendance_status` and `recitation_rating` — not duplicated here; they are referenced
by the system rules' `system_key`.)

---

## Table: `dinar_rules`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `institute_id` | uuid NOT NULL → institutes(id) ON DELETE CASCADE | tenant scope |
| `name` | text NOT NULL | ≤ 100 chars (validated in DTO + entity) |
| `amount` | integer NOT NULL | signed, **non-zero** (entity guard) |
| `context` | `dinar_context` NOT NULL | `attendance`/`recitation`/`lesson` |
| `trigger` | text NOT NULL | `'manual'` \| `'automatic'` |
| `system_key` | text NULL | one of the 9 keys for system rules, else NULL |
| `is_active` | boolean NOT NULL default true | |
| `is_protected` | boolean NOT NULL default false | true = system rule (no delete/re-context) |
| `created_at` | timestamptz NOT NULL default now() | |

Indexes / constraints:
- `unique (institute_id, system_key)` where `system_key IS NOT NULL` — one slot per key per institute.
- index `(institute_id)` for the catalogue listing.

**System keys** (`system-rule-keys.ts`, seeded lazily, defaults `amount 0`, `is_active false`,
`is_protected true`):

```
attendance.present   attendance.absent   attendance.late   attendance.justified
recitation.excellent recitation.very_good recitation.good  recitation.acceptable  recitation.weak
```

`context` for `attendance.*` = `attendance`; for `recitation.*` = `recitation`;
`trigger` = `automatic`.

### `DinarRule` entity guards (domain, framework-free)
- `create(manual)`: name non-empty ≤100; `amount !== 0`; context ∈ {lesson, recitation};
  trigger = manual; protected = false.
- `rename(name)` / `setAmount(amount)`: same validation; **allowed on protected** rules
  (managers re-value system rules).
- `setActive(bool)`: allowed on all.
- `assertDeletable()`: throws if `is_protected` (system rule) — deletion of manual
  rules with history is blocked at the use-case (needs repo `countTransactionsForRule`).
- Re-contexting a protected rule is not exposed.

---

## Table: `dinar_transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `institute_id` | uuid NOT NULL → institutes(id) ON DELETE CASCADE | tenant scope |
| `student_id` | uuid NOT NULL → users(id) ON DELETE CASCADE | |
| `amount` | integer NOT NULL | signed snapshot, non-zero |
| `context` | `dinar_context` NOT NULL | |
| `source_type` | `dinar_source_type` NOT NULL | |
| `rule_id` | uuid NULL → dinar_rules(id) ON DELETE RESTRICT | null for exceptional/reversal |
| `rule_name` | text NULL | **snapshot** of rule name at award time |
| `reason` | text NULL | required when `source_type='exceptional'`; ≤ 200 |
| `source_ref` | text NULL | attendance `"{classId}:{date}"`; recitation `recitationId`; else NULL |
| `awarded_by` | uuid NULL → users(id) | staff actor / attendance taker / reciter |
| `reverses_id` | uuid NULL → dinar_transactions(id) | set on a compensating reversal row |
| `reversed_at` | timestamptz NULL | stamped on the original when reversed |
| `created_at` | timestamptz NOT NULL default now() | |

Indexes / constraints:
- **partial unique** `(source_type, source_ref, student_id)` where `source_ref IS NOT NULL`
  — idempotency for automatic projections.
- index `(institute_id, student_id)` — balance, summary, student ledger.
- index `(institute_id)` — leaderboard scans (joined to class membership).

### `DinarTransaction` entity factories (domain)
- `awardRule({institute, student, rule, context, awardedBy})` — snapshots
  `rule_id`, `rule_name`, `amount`; `source_type` = `manual_rule`; `source_ref` = null.
- `awardExceptional({institute, student, amount, reason, context, awardedBy})` —
  `source_type = exceptional`; requires non-empty `reason` ≤ 200; `amount !== 0`.
- `projectAttendance({institute, student, rule, classId, date, awardedBy})` —
  `source_type = attendance`; `source_ref = "{classId}:{date}"`; snapshots amount/name.
- `projectRecitation({institute, student, rule, recitationId, awardedBy})` —
  `source_type = recitation`; `source_ref = recitationId`.
- `reversalOf(original)` — `amount = -original.amount`; `reverses_id = original.id`;
  carries `context`/`source_type` of the original (manual only); requires the original
  is manual and not already reversed.

---

## Derived read model

- **`DinarBalance`** (`GetStudentDinarsUseCase`): `net = SUM(amount)`,
  `positive = SUM(amount) WHERE amount>0`, `negative = SUM(amount) WHERE amount<0`,
  scoped to `(institute_id, student_id)`.
- **Ledger item**: `{ id, amount, context, sourceType, ruleName|reason, awardedByName,
  reversedAt, createdAt }`, newest-first.
- **Leaderboard row**: `{ studentId, name, balance }` — `SUM(amount) GROUP BY student`,
  restricted to a class's `studentIds` (class scope) or all institute students
  (institute scope); ranked descending, ties share a rank (computed in the use-case).

---

## Reconciliation algorithms (pure, unit-tested)

**Attendance sync** (`SyncAttendanceDinarsUseCase.execute(actor, {instituteId, classId, date, entries:[{studentId,status}], takenBy})`):
1. Load active attendance system rules for the institute → `Map<status, rule>`.
2. `source_ref = "{classId}:{date}"`. Load existing attendance txns for this
   `source_ref` → `Map<studentId, txn>`.
3. For each entry:
   - target = active rule for `status` (may be absent/inactive → target = none).
   - if existing txn matches target (same `rule_id` & `amount`) → keep.
   - else delete existing (if any) and, if target exists, insert new projection.
4. For existing studentIds not present in `entries` → delete (student removed from session).

**Recitation apply** (`ApplyRecitationDinarUseCase.execute({instituteId, studentId, recitationId, rating, recitedBy})`):
1. Look up active recitation system rule for `rating`.
2. Upsert a projection keyed by `(recitation, recitationId, studentId)`; if the rule is
   inactive/absent, ensure no projection exists.

Both are **idempotent**: re-running with the same inputs yields no change.
