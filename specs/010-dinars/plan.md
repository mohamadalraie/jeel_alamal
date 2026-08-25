# Implementation Plan: Dinars — Student Rewards Currency (نظام الدنانير)

**Branch**: `010-dinars` | **Date**: 2026-07-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-dinars/spec.md`

## Summary

A new `dinars` bounded context (backend module + frontend feature) implementing a
dynamic, rule-based reward currency. A **DinarRule** carries a signed integer
amount and a context (`lesson` / `recitation` / `attendance`). Manual rules are
created freely by managers; nine **system rules** (4 attendance statuses + 5
recitation ratings) are seeded lazily per institute and configured (amount +
active) by managers. Teachers and managers award **manual** dinars (rule or
exceptional-with-reason, single or bulk) during a live lesson or from a
student/class profile. Attendance and recitation events **automatically** award
dinars as *projections* of their source record. A student's balance is the
arithmetic `SUM(amount)` of an immutable-for-manual / replaceable-for-automatic
ledger. All data is institute-scoped; one new migration `0005`.

## Technical Context

**Language/Version**: TypeScript 5, Node 24

**Primary Dependencies**: NestJS (backend), Next.js App Router (frontend, Next 16),
Drizzle ORM, TanStack Query v5, shadcn/ui, next-intl

**Storage**: PostgreSQL via Drizzle — one new migration `0005_dinars.sql`
(two tables `dinar_rules`, `dinar_transactions`; two new enums). Schema files are
auto-discovered by `drizzle.config.ts` glob `./src/**/*.schema.ts`.

**Testing**: Jest — backend use-case unit tests with in-memory fakes (reconciliation
and RBAC/tenant scoping are the priority cases).

**Target Platform**: Docker Compose (dev), mobile-first web

**Performance Goals**: award reflects in balance < 2 s (SC-002); student history
(≤ 500 entries) and class leaderboard (≤ 100 students) render < 2 s (SC-003/004).

**Constraints**: Mobile-first; ar RTL default + en LTR; light + dark; semantic
tokens only; no duplicated primitives; server-side RBAC + tenant scoping.

**Scale/Scope**: Per-institute. Typical class ≤ 100 students; a student may
accumulate hundreds of entries per term. Integer dinars only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| I. Clean Architecture — 4 layers | ✅ | New `dinars` module copies the `users`/`recitations` shape: `domain/` (entities + repo ports, no framework), `application/` (use-cases + DTOs), `infrastructure/` (Drizzle schema + repo impl), `presentation/` (thin controller). Reconciliation logic is pure and unit-testable with in-memory fakes. |
| II. Multi-tenancy — every mutation scoped to institute | ✅ | Every rule and transaction carries `institute_id`; every use-case resolves the institute server-side (from the student/class/actor) and filters by it. No client-sent institute id. |
| III. RBAC — deny by default | ✅ | Rule config: `assertManagerOf`. Manual award: teacher must share a class with the student, or manager of the institute (`assertManagerOf`/class-membership check). Student view: self-only or staff. Leaderboard: staff; teacher limited to own classes. |
| IV. JWT cookies, no client-sent institute_id | ✅ | Actor comes from `@CurrentUser()`; ids in the URL are `studentId`/`classId`/`ruleId`, institute derived server-side. |
| V. Component reuse — no duplicated primitives | ✅ | Reuse `Button`, `Dialog`, `Input`, `Select`, `Badge`, `DropdownMenu`, `EmptyState`, `ConfirmDialog`, skeletons. One new `AwardDinarDialog` and one `DinarBadge` (composed from `Badge`), reused by lesson timer, profiles, and roster. |
| VI. Semantic tokens only | ✅ | Positive dinars via `success` token, negative via `destructive`; no raw hex. |
| VII. ar RTL + en LTR, mobile-first | ✅ | All strings in `messages/ar.json` + `en.json` under a new `dinars` namespace; amounts wrapped in `<bdi>`; logical properties. |
| VIII. Drizzle migrations — no push | ✅ | `db:generate` → review `0005_dinars.sql` → commit → `migration:run`. |
| IX. Containerised | ✅ | No infra change; runs in existing services. |
| X. Spec-driven | ✅ | This plan + research/data-model/contracts/quickstart under `specs/010-dinars/`. |

**Result**: PASS (no violations; Complexity Tracking not required).

## Project Structure

### Documentation (this feature)

```text
specs/010-dinars/
├── plan.md              # This file
├── spec.md
├── research.md          # Phase 0 — key design decisions
├── data-model.md        # Phase 1 — entities, schema, reconciliation
├── quickstart.md        # Phase 1 — end-to-end validation guide
├── contracts/
│   └── dinars-api.md     # Phase 1 — REST endpoints
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
backend/src/modules/dinars/                          NEW MODULE
├── domain/
│   ├── dinar-context.ts                 enum: lesson | recitation | attendance | general
│   ├── dinar-source.ts                  enum: manual_rule | exceptional | attendance | recitation
│   ├── dinar-rule.entity.ts             DinarRule aggregate (create/rename/setAmount/activate; guards)
│   ├── dinar-transaction.entity.ts      DinarTransaction (immutable manual; factory for auto + reversal)
│   ├── system-rule-keys.ts              the 9 seeded system keys + defaults
│   ├── dinar-rule.repository.ts         DINAR_RULE_REPOSITORY port
│   └── dinar-transaction.repository.ts  DINAR_TRANSACTION_REPOSITORY port (+ balance/summary/leaderboard reads)
├── application/
│   ├── dto/dinar.dto.ts                 Create/Update rule, Award, BulkAward, views (rule, ledger item, summary, leaderboard row)
│   ├── dinar-rules.use-cases.ts         List/Create/Update/Delete manual + Get/Configure system rules (lazy seed)
│   ├── award-dinar.use-cases.ts         AwardDinarUseCase, BulkAwardDinarUseCase, ReverseDinarUseCase
│   ├── student-dinars.use-cases.ts      GetStudentDinarsUseCase (summary + ledger)
│   ├── leaderboard.use-case.ts          GetDinarLeaderboardUseCase (class | institute)
│   ├── sync-attendance-dinars.use-case.ts   reconcile attendance projection (called by attendance module)
│   ├── apply-recitation-dinar.use-case.ts   apply/replace recitation projection (called by recitations module)
│   └── dinar-award.policy.ts            canAwardStudent(actor, student) — teacher shares class OR manager
├── infrastructure/persistence/
│   ├── dinar.schema.ts                  dinar_rules + dinar_transactions tables + 2 enums
│   ├── drizzle-dinar-rule.repository.ts
│   └── drizzle-dinar-transaction.repository.ts
├── presentation/
│   └── dinars.controller.ts             rule config, award, reverse, student view, leaderboard routes
└── dinars.module.ts                     imports Users/Classes/Institutes; exports the two sync use-cases

backend/src/modules/attendance/application/attendance.use-cases.ts   EDIT — TakeAttendance calls SyncAttendanceDinarsUseCase
backend/src/modules/attendance/attendance.module.ts                  EDIT — import DinarsModule
backend/src/modules/recitations/application/recitation.use-cases.ts  EDIT — AddRecitation calls ApplyRecitationDinarUseCase
backend/src/modules/recitations/recitations.module.ts                EDIT — import DinarsModule
backend/src/app.module.ts                                            EDIT — register DinarsModule
backend/drizzle/0005_dinars.sql                                      NEW (generated, reviewed)

frontend/src/
├── lib/
│   ├── types.ts        EDIT — DinarRule, DinarContext, DinarLedgerItem, DinarSummary, DinarLeaderboardRow
│   ├── api.ts          EDIT — rule CRUD, award, bulkAward, reverse, getStudentDinars, getDinarLeaderboard
│   └── queries.ts      EDIT — qk + hooks: useDinarRules, useStudentDinars, useDinarLeaderboard
├── features/dinars/
│   ├── dinar-badge.tsx            NEW — signed amount pill (success/destructive), <bdi>
│   ├── award-dinar-dialog.tsx     NEW — student(s) + rule|exceptional(amount+reason); single & bulk
│   ├── dinar-rules-manager.tsx    NEW — manual rules CRUD + system rules config (manager)
│   ├── student-dinars-view.tsx    NEW — summary card (net/pos/neg) + ledger list; self or staff
│   └── dinar-leaderboard.tsx      NEW — ranked list; class or institute scope
└── app/[locale]/dashboard/
    └── dinars/
        ├── settings/page.tsx      NEW — manager-only rules page
        └── leaderboard/page.tsx   NEW — staff leaderboard (institute + class switch)

frontend/src/features/lessons/lesson-timer-page.tsx  EDIT — "Award dinars" action → AwardDinarDialog (context=lesson)
frontend/src/features/<student-profile>              EDIT — add Dinars tab (mirror recitation/attendance tab)
frontend/messages/ar.json + en.json                  EDIT — new `dinars` namespace
```

**Structure Decision**: New self-contained backend module `backend/src/modules/dinars/`
(four layers, copying the `recitations` module which similarly reuses
`UsersModule`/`ClassesModule`/`InstitutesModule`) and a new frontend feature slice
`frontend/src/features/dinars/`. Integration with attendance and recitation is a
**one-way** dependency: those modules import `DinarsModule` and call an exported
sync use-case after they persist their own data. `dinars` never imports attendance
or recitations, so there is no cycle.

## Key Design Decisions (see research.md for full rationale)

1. **Automatic dinars are projections, not audit entries.** Attendance re-takes
   `delete`+`insert` the session (IDs are not stable). So automatic dinars are
   reconciled by **natural key**, and on source change they are **replaced in place**
   (no compensating reversal noise in the student ledger). Manual/exceptional dinars
   remain an **immutable** ledger; corrections are compensating reversal entries.
   → This refines FR-009/FR-012: reversal-entries apply to *manual* awards;
   *automatic* awards are replaced/removed.

2. **Natural key for idempotency.** `dinar_transactions` has a partial unique index
   on `(source_type, source_ref, student_id)` for automatic rows. Attendance
   `source_ref = "{classId}:{date}"`; recitation `source_ref = recitationId`.
   Manual rows have `source_ref = NULL` (Postgres treats NULLs as distinct, so many
   manual awards coexist).

3. **Balance = plain `SUM(amount)`.** Reversal compensating entries net to zero;
   replaced projections update in place — so the sum is always correct without a
   stored/materialised balance. A read index `(institute_id, student_id)` keeps it fast.

4. **System rules seeded lazily** (mirrors `LessonSettings` in spec 009): the
   rules-config use-case upserts the 9 system rules with defaults (`amount 0`,
   `active false`) on first read, avoiding a backfill migration for existing institutes.

5. **Value/name snapshot** on every transaction (`amount`, `rule_name`/`reason`) so
   later rule edits never alter history (FR-011).

6. **Recitation delete/edit is out of scope now** (no such endpoint exists today).
   `ApplyRecitationDinarUseCase` runs on *add*; the source link makes future
   delete-reconciliation a one-liner, but we do not add recitation delete in this feature.

## Implementation Phases (high-level; task breakdown comes from `/speckit-tasks`)

- **Phase A — Backend domain + schema**: enums, `DinarRule`/`DinarTransaction`
  entities with guards, system-rule keys/defaults, repo ports, `dinar.schema.ts`;
  `db:generate` → review → `0005_dinars.sql` → `migration:run`.
- **Phase B — Backend application**: rules use-cases (incl. lazy seed + delete guard),
  award/bulk/reverse use-cases + `dinar-award.policy`, student view, leaderboard,
  and the two sync use-cases. Unit tests for reconciliation, snapshot, RBAC, tenant.
- **Phase C — Integrations**: wire `TakeAttendanceUseCase` → `SyncAttendanceDinarsUseCase`;
  `AddRecitationUseCase` → `ApplyRecitationDinarUseCase`; module imports; `app.module`.
- **Phase D — Frontend data layer**: types, api, queries.
- **Phase E — Frontend features**: `DinarBadge`, `AwardDinarDialog`, `DinarRulesManager`,
  `StudentDinarsView`, `DinarLeaderboard`; timer-page action; student-profile Dinars tab;
  manager settings + leaderboard pages.
- **Phase F — i18n + polish**: `dinars` namespace in both locales; light/dark + RTL/LTR
  + mobile checks; `npm run build` + lint both apps.

## Complexity Tracking

No constitution violations — table intentionally omitted.
