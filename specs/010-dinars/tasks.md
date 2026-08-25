---
description: "Task list for Dinars (نظام الدنانير) implementation"
---

# Tasks: Dinars — Student Rewards Currency (نظام الدنانير)

**Input**: Design documents from `/specs/010-dinars/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dinars-api.md, quickstart.md

**Tests**: Backend use-case unit tests ARE included — the constitution's Definition of
Done (Gate 2) requires unit tests with in-memory fakes for new/changed use-cases, and
the plan flags reconciliation + RBAC + tenant scoping as priority cases. Frontend has
no automated tests (manual DoD checks in Polish).

**Organization**: Tasks grouped by user story (US1–US5) for independent delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5; Setup/Foundational/Polish carry no story label
- All paths are repo-relative and exact.

## Path Conventions

- Backend module: `backend/src/modules/dinars/` (four layers, copies `recitations`)
- Frontend slice: `frontend/src/features/dinars/`
- Messages: `frontend/messages/ar.json`, `frontend/messages/en.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Module skeleton + framework-free primitives shared by everything.

- [X] T001 Create the `dinars` module folder tree under `backend/src/modules/dinars/` with `domain/`, `application/dto/`, `infrastructure/persistence/`, `presentation/` subfolders (empty), mirroring `backend/src/modules/recitations/`.
- [X] T002 [P] Create context enum in `backend/src/modules/dinars/domain/dinar-context.ts` (`lesson | recitation | attendance | general`) with `DINAR_CONTEXTS` array.
- [X] T003 [P] Create source-type enum in `backend/src/modules/dinars/domain/dinar-source.ts` (`manual_rule | exceptional | attendance | recitation`) with `DINAR_SOURCE_TYPES` array.
- [X] T004 [P] Create `backend/src/modules/dinars/domain/system-rule-keys.ts` — the 9 fixed keys (`attendance.present|absent|late|justified`, `recitation.excellent|very_good|good|acceptable|weak`) plus a `SYSTEM_RULE_DEFAULTS` list mapping each key → `{ context, trigger:'automatic', amount:0, isActive:false }`, and helpers to map an `AttendanceStatus`/`RecitationRating` to its key.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entities, ports, schema+migration, repo impls, module wiring — everything
every story needs. **⚠️ No user story can start until this phase is complete.**

- [X] T005 [P] `DinarRule` entity in `backend/src/modules/dinars/domain/dinar-rule.entity.ts` — `create()` (manual: name ≤100 non-empty, `amount!==0`, context∈{lesson,recitation}, protected=false), `rename()`, `setAmount()` (allowed on protected), `setActive()`, `assertDeletable()` (throws if protected), `reconstitute()`, getters. No framework imports.
- [X] T006 [P] `DinarTransaction` entity in `backend/src/modules/dinars/domain/dinar-transaction.entity.ts` — factories `awardRule`, `awardExceptional` (reason 1..200 required, `amount!==0`), `projectAttendance` (source_ref `"{classId}:{date}"`), `projectRecitation` (source_ref recitationId), `reversalOf` (manual + not-already-reversed guard, `amount=-original`); `reconstitute()`, getters, `markReversed()`.
- [X] T007 [P] Rule repo port in `backend/src/modules/dinars/domain/dinar-rule.repository.ts` — `DINAR_RULE_REPOSITORY` symbol + interface: `findByInstitute`, `findSystemByInstitute`, `findById`, `save`, `delete`, `seedSystemRules(instituteId, defaults)`, `countTransactionsForRule` (or expose via txn repo).
- [X] T008 [P] Transaction repo port in `backend/src/modules/dinars/domain/dinar-transaction.repository.ts` — `DINAR_TRANSACTION_REPOSITORY` symbol + interface: `save`, `saveMany`, `findById`, `findBySourceRef(sourceType, sourceRef)`, `deleteById`, `existsForRule(ruleId)`, `findByStudent(studentId)`, `summaryByStudent(studentId)`, `balancesForStudents(studentIds[])`.
- [X] T009 Drizzle schema in `backend/src/modules/dinars/infrastructure/persistence/dinar.schema.ts` — `dinar_context` + `dinar_source_type` pgEnums; `dinar_rules` and `dinar_transactions` tables with all columns, FKs, the partial-unique index `(source_type, source_ref, student_id) WHERE source_ref IS NOT NULL`, `(institute_id, system_key)` unique, and read indexes per data-model.md.
- [X] T010 Generate migration: `docker compose exec backend npm run db:generate`; review the SQL; commit as `backend/drizzle/0005_dinars.sql`. (Do NOT `drizzle-kit push`.)
- [X] T011 [P] Drizzle rule repo in `backend/src/modules/dinars/infrastructure/persistence/drizzle-dinar-rule.repository.ts` implementing `DinarRuleRepository`, including transactional `seedSystemRules` (insert-if-absent per key).
- [X] T012 [P] Drizzle transaction repo in `backend/src/modules/dinars/infrastructure/persistence/drizzle-dinar-transaction.repository.ts` implementing `DinarTransactionRepository` with `SUM(amount)` summary/balance queries and grouped leaderboard balances.
- [X] T013 [P] DTO file `backend/src/modules/dinars/application/dto/dinar.dto.ts` — `CreateRuleDto`, `UpdateRuleDto`, `AwardDto` (rule or exceptional), `BulkAwardDto`, and view types `DinarRuleView`, `DinarLedgerItem`, `DinarSummary`, `DinarLeaderboardRow` (class-validator decorators + length limits).
- [X] T014 Create `backend/src/modules/dinars/dinars.module.ts` importing `UsersModule`, `ClassesModule`, `InstitutesModule`; provide both repo bindings; controller + use-cases added per story; export the two sync use-cases (added in US3).
- [X] T015 Register `DinarsModule` in `backend/src/app.module.ts` imports array (after `LessonsModule`).
- [X] T016 Create controller shell `backend/src/modules/dinars/presentation/dinars.controller.ts` (`@Controller()`, `@CurrentUser()` usage) — routes added per story.
- [X] T017 [P] Frontend `DinarBadge` in `frontend/src/features/dinars/dinar-badge.tsx` — signed-amount pill composed from `components/ui/badge`, `success` token for `+`, `destructive` for `−`, amount wrapped in `<bdi>`. (Shared by US2/US4/US5.)

**Checkpoint**: Tables exist, entities/ports/repos wired, module registered. Stories can begin.

---

## Phase 3: User Story 1 — Manager Defines & Configures Rules (Priority: P1) 🎯 MVP

**Goal**: Managers create/edit/delete manual rules and configure the 9 seeded system rules.

**Independent Test**: A manager creates a manual rule and sets/activates system-rule
amounts; manual rules become selectable; deleting a used/system rule is blocked.

### Tests for User Story 1

- [X] T018 [P] [US1] Unit spec `backend/src/modules/dinars/application/dinar-rules.use-cases.spec.ts` with in-memory fakes: lazy seed creates exactly 9 system rules once (idempotent), create/rename/setAmount validation, delete blocked when protected or has history, tenant scoping (institute A can't see B), non-manager rejected.

### Implementation for User Story 1

- [X] T019 [US1] `backend/src/modules/dinars/application/dinar-rules.use-cases.ts` — `GetDinarRulesUseCase` (assertManagerOf; lazy `seedSystemRules`; returns `{manual, system}`), `CreateManualRuleUseCase`, `UpdateRuleUseCase` (reject name/context change on protected), `DeleteManualRuleUseCase` (assertDeletable + `existsForRule` guard → ConflictError).
- [X] T020 [US1] Add rule routes to `backend/src/modules/dinars/presentation/dinars.controller.ts`: `GET /institutes/:instituteId/dinar-rules`, `POST /institutes/:instituteId/dinar-rules`, `PATCH /dinar-rules/:ruleId`, `DELETE /dinar-rules/:ruleId`; register the 4 use-cases in `dinars.module.ts`.
- [X] T021 [P] [US1] Frontend types in `frontend/src/lib/types.ts` — `DinarContext`, `DinarRule` (`{id,name,amount,context,trigger,systemKey,isActive,isProtected,createdAt}`).
- [X] T022 [US1] Frontend api in `frontend/src/lib/api.ts` — `getDinarRules`, `createDinarRule`, `updateDinarRule`, `deleteDinarRule`.
- [X] T023 [US1] Frontend query hooks in `frontend/src/lib/queries.ts` — `qk.dinarRules(instituteId)` + `useDinarRules(instituteId)`.
- [X] T024 [US1] `frontend/src/features/dinars/dinar-rules-manager.tsx` — manual rules CRUD (create dialog, edit, delete via `ConfirmDialog`) + system-rules section (amount input + active toggle per seeded rule), reusing `Button`/`Input`/`Select`/`DropdownMenu`/`Badge`.
- [X] T025 [US1] Manager page `frontend/src/app/[locale]/dashboard/dinars/settings/page.tsx` (manager-only) rendering `DinarRulesManager`.
- [X] T026 [US1] Add `dinars` namespace + US1 keys to `frontend/messages/ar.json` and `frontend/messages/en.json` (rule labels, contexts, system-rule names, create/edit/delete, validation).

**Checkpoint**: Rules can be defined and configured end-to-end.

---

## Phase 4: User Story 2 — Staff Award Manual Dinars (Priority: P1)

**Goal**: Teachers/managers award rule or exceptional dinars (single + bulk) during a
lesson or from a profile, with reversal.

**Independent Test**: Award a rule and an exceptional amount (single + bulk); balance
updates; cross-class award blocked; reverse creates a compensating entry (once only).

### Tests for User Story 2

- [X] T027 [P] [US2] Unit spec `backend/src/modules/dinars/application/award-dinar.use-cases.spec.ts`: rule award snapshots amount/name; exceptional requires reason; bulk creates one txn per student; reverse creates `-amount` + marks original + blocks second reverse + blocks automatic; `canAwardStudent` allows manager/own-class-teacher and rejects cross-class/student; tenant scoping.

### Implementation for User Story 2

- [X] T028 [P] [US2] `backend/src/modules/dinars/application/dinar-award.policy.ts` — `canAwardStudent(actor, student)` using `InstituteAccessPolicy` + `ClassRepository.findCurrentClassOfStudent`/`isTeacherOfClass`.
- [X] T029 [US2] `backend/src/modules/dinars/application/award-dinar.use-cases.ts` — `AwardDinarUseCase` (rule|exceptional), `BulkAwardDinarUseCase` (validates every student via policy before saving), `ReverseDinarUseCase` (author-or-manager; guards). Depends on T028 + repos.
- [X] T030 [US2] Add award routes to `dinars.controller.ts`: `POST /students/:studentId/dinars`, `POST /dinars/bulk`, `POST /dinars/:transactionId/reverse`; register use-cases + policy in `dinars.module.ts`.
- [X] T031 [P] [US2] Frontend types in `frontend/src/lib/types.ts` — `DinarLedgerItem` (`{id,amount,context,sourceType,label,awardedByName,reversedAt,createdAt}`).
- [X] T032 [US2] Frontend api in `frontend/src/lib/api.ts` — `awardDinar`, `bulkAwardDinars`, `reverseDinar`.
- [X] T033 [US2] `frontend/src/features/dinars/award-dinar-dialog.tsx` — reusable dialog: student(s) prop (single or list for bulk), toggle rule-picker vs exceptional (amount + required reason), submit + toast + query invalidation. Reuses `Dialog`/`Select`/`Input`/`Button`.
- [X] T034 [US2] Wire "Award dinars" action into `frontend/src/features/lessons/lesson-timer-actions.tsx` opening `AwardDinarDialog` with `context='lesson'` for the class roster (single + bulk).
- [X] T035 [US2] Add "Award dinars" entry points on the staff student profile `frontend/src/app/[locale]/dashboard/students/[studentId]/page.tsx` (context `general`) and the class page roster `frontend/src/app/[locale]/dashboard/classes/[classId]/page.tsx` (bulk).
- [X] T036 [US2] Add US2 keys to `frontend/messages/ar.json` + `en.json` (award, exceptional, reason, bulk, reverse, confirmations).

**Checkpoint**: Manual awarding + reversal work from lesson and profiles.

---

## Phase 5: User Story 3 — Automatic Dinars from Attendance & Recitation (Priority: P2)

**Goal**: Attendance/recitation events auto-award dinars as reconciled projections.

**Independent Test**: Marking/altering attendance and logging recitations create,
replace, and remove dinar projections idempotently, only when the rule is active.

### Tests for User Story 3

- [X] T037 [P] [US3] Unit spec `backend/src/modules/dinars/application/sync-attendance-dinars.use-case.spec.ts`: absent→creates −8; re-take present→replaces with +2 (no leftover); unchanged re-save→no-op (idempotent); inactive rule→no entry; student removed from session→projection deleted.
- [X] T038 [P] [US3] Unit spec `backend/src/modules/dinars/application/apply-recitation-dinar.use-case.spec.ts`: excellent→+10 keyed by recitationId; inactive rule→no entry; re-apply same→no duplicate.

### Implementation for User Story 3

- [X] T039 [US3] `backend/src/modules/dinars/application/sync-attendance-dinars.use-case.ts` — `SyncAttendanceDinarsUseCase.execute(actor,{instituteId,classId,date,entries,takenBy})` implementing the diff-reconcile algorithm from data-model.md (source_ref `"{classId}:{date}"`).
- [X] T040 [US3] `backend/src/modules/dinars/application/apply-recitation-dinar.use-case.ts` — `ApplyRecitationDinarUseCase.execute({instituteId,studentId,recitationId,rating,recitedBy})` upsert-by-`recitationId`.
- [X] T041 [US3] Export both sync use-cases from `backend/src/modules/dinars/dinars.module.ts` (add to `providers` + `exports`).
- [X] T042 [US3] Wire attendance: edit `backend/src/modules/attendance/application/attendance.use-cases.ts` so `TakeAttendanceUseCase` calls `SyncAttendanceDinarsUseCase` after `upsertSession`; inject it and import `DinarsModule` in `backend/src/modules/attendance/attendance.module.ts`.
- [X] T043 [US3] Wire recitation: edit `backend/src/modules/recitations/application/recitation.use-cases.ts` so `AddRecitationUseCase` calls `ApplyRecitationDinarUseCase` after `save`; inject it and import `DinarsModule` in `backend/src/modules/recitations/recitations.module.ts`.
- [X] T044 [US3] Update the affected existing specs (`attendance`/`recitation` use-case specs) to provide the new dinar-sync dependency as a fake so they still pass.

**Checkpoint**: Attendance/recitation feed the ledger correctly and idempotently.

---

## Phase 6: User Story 4 — Student Views Balance & History (Priority: P2)

**Goal**: A student sees net/positive/negative balance and full ledger; own data only.

**Independent Test**: Student sees accurate summary + newest-first ledger; another
student's data is denied; empty state at zero.

### Tests for User Story 4

- [X] T045 [P] [US4] Unit spec `backend/src/modules/dinars/application/student-dinars.use-cases.spec.ts`: summary math (net/pos/neg/count), self-allowed, staff-allowed, other-student denied, tenant scoping, empty→zeros.

### Implementation for User Story 4

- [X] T046 [US4] `backend/src/modules/dinars/application/student-dinars.use-cases.ts` — `GetStudentDinarsUseCase` (self or `assertStaffOf`) returning `{summary, ledger}`; register in `dinars.module.ts`.
- [X] T047 [US4] Add `GET /students/:studentId/dinars` to `dinars.controller.ts`.
- [X] T048 [P] [US4] Frontend types in `frontend/src/lib/types.ts` — `DinarSummary` (`{net,positive,negative,count}`).
- [X] T049 [US4] Frontend api + query — `getStudentDinars` in `frontend/src/lib/api.ts`; `qk.studentDinars(id)` + `useStudentDinars(id)` in `frontend/src/lib/queries.ts`.
- [X] T050 [US4] `frontend/src/features/dinars/student-dinars-view.tsx` — summary card (net + positive + negative using `DinarBadge`) + ledger list (label, teacher, date, reversed styling) + `EmptyState`; mirrors `student-recitation-tab.tsx`.
- [X] T051 [US4] Mount a **Dinars** tab on staff student profile `frontend/src/app/[locale]/dashboard/students/[studentId]/page.tsx` and on the student self view `frontend/src/app/[locale]/dashboard/my-profile/page.tsx`.
- [X] T052 [US4] Add US4 keys to `frontend/messages/ar.json` + `en.json` (balance, net/positive/negative, history, empty state).

**Checkpoint**: Students and staff can read a student's dinars.

---

## Phase 7: User Story 5 — Leaderboard (Priority: P3)

**Goal**: Ranked list by balance, per class or institute; teacher limited to own classes.

**Independent Test**: Manager sees class + institute rankings; teacher sees only their
classes; ties share a rank.

### Tests for User Story 5

- [X] T053 [P] [US5] Unit spec `backend/src/modules/dinars/application/leaderboard.use-case.spec.ts`: descending ranking with shared ranks on ties; class scope vs institute scope; teacher requesting institute-wide or non-taught class denied; tenant scoping.

### Implementation for User Story 5

- [X] T054 [US5] `backend/src/modules/dinars/application/leaderboard.use-case.ts` — `GetDinarLeaderboardUseCase(actor, instituteId, classId?)`: manager→institute or any class; teacher→must teach the class; computes rank ties; register in `dinars.module.ts`.
- [X] T055 [US5] Add `GET /institutes/:instituteId/dinar-leaderboard?classId=` to `dinars.controller.ts`.
- [X] T056 [P] [US5] Frontend types `DinarLeaderboardRow` in `frontend/src/lib/types.ts`; api `getDinarLeaderboard` in `frontend/src/lib/api.ts`; `qk.dinarLeaderboard` + `useDinarLeaderboard` in `frontend/src/lib/queries.ts`.
- [X] T057 [US5] `frontend/src/features/dinars/dinar-leaderboard.tsx` — ranked list (rank, name, `DinarBadge`) with class/institute scope switch; reuse existing list primitives.
- [X] T058 [US5] Staff page `frontend/src/app/[locale]/dashboard/dinars/leaderboard/page.tsx` (institute switch for managers; class picker) + a class-scoped entry from `classes/[classId]/page.tsx`.
- [X] T059 [US5] Add US5 keys to `frontend/messages/ar.json` + `en.json` (leaderboard, rank, scope labels).

**Checkpoint**: All five stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Verify every new screen (rules settings, award dialog, student dinars tab, leaderboard) in **ar (RTL)** and **en (LTR)**, **light + dark**, at a **mobile** viewport; fix logical-property/`<bdi>` issues.
- [X] T061 [P] Confirm only semantic tokens used (positive→`success`, negative→`destructive`); no raw hex / palette classes; no duplicated primitives.
- [X] T062 Run `npm run build` + `npm run lint` in **backend** and **frontend**; fix any failures.
- [X] T063 Run `docker compose exec backend npm test -- dinars` and the touched attendance/recitation specs; all green.
- [X] T064 Execute `specs/010-dinars/quickstart.md` scenarios 1–5 against the running stack (fresh usernames; do NOT wipe volumes).
- [X] T065 Re-review `backend/drizzle/0005_dinars.sql` for the partial-unique + FK `ON DELETE` behaviours; confirm committed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: no deps.
- **Foundational (P2)**: depends on Setup — **blocks all stories**. T010 (migration) depends on T009; repo impls (T011–T012) depend on T009; module reg (T014–T016) depend on ports/repos.
- **US1 (P3)** & **US2 (P4)** (both P1): depend only on Foundational. US2 is independent of US1 in code, but is only *useful* once rules exist (demo order US1→US2).
- **US3 (P5)**: depends on Foundational; system rules from US1 give it data, but the sync code is independent. Editing attendance/recitation specs (T044) depends on T042/T043.
- **US4 (P6)** & **US5 (P7)**: depend on Foundational; display data produced by US2/US3.
- **Polish (P8)**: after all desired stories.

### Within Each User Story

- Backend: entity/port (Foundational) → use-case → controller route → module registration.
- Unit test (spec) can be written alongside/before its use-case.
- Frontend: types → api → queries → component → page → i18n.

### Parallel Opportunities

- Setup: T002, T003, T004 in parallel.
- Foundational: T005–T008 (entities+ports) in parallel; then T009→T010; T011, T012, T013, T017 in parallel after T009.
- Each story's `[P]` type/test tasks run in parallel; shared files (`types.ts`, `api.ts`, `queries.ts`, `dinars.controller.ts`, `dinars.module.ts`, `messages/*.json`) are edited sequentially within/across stories.
- With capacity, US1/US2/US3/US4/US5 backend use-cases can proceed in parallel once Foundational is done (different files), converging on the shared controller/module (sequence those edits).

---

## Implementation Strategy

### MVP (Stories US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational (migration applied).
2. US1 (define rules) → US2 (award manually). **STOP & VALIDATE** quickstart scenarios 1–2.
   This is a usable product: managers configure, teachers award, balances accrue.

### Incremental Delivery

3. US3 → automatic attendance/recitation dinars (quickstart 3).
4. US4 → student balance & history view (quickstart 4).
5. US5 → leaderboard (quickstart 5).
6. Polish → DoD gates.

---

## Notes

- `[P]` = different files, no incomplete-task dependency.
- Automatic dinars are **projections** (replaced in place); only **manual** entries use
  reversal compensation — keep this distinction when implementing T029 vs T039/T040.
- Never `drizzle-kit push`; migration `0005` is the only schema change.
- Commit per task or logical group; conventional commit messages (`feat:`…).
