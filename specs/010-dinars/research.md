# Research — Dinars (نظام الدنانير)

Phase 0 decisions. Each resolves an unknown or dependency surfaced by the spec and
the existing codebase.

---

## D1 — One `Rule` entity with `context` + `trigger`, not three separate types

**Decision**: Model every reward definition as a single `DinarRule` with a signed
integer `amount`, a `context` (`lesson` | `recitation` | `attendance`) and a
`trigger` (`manual` | `automatic`). The user's "three types" are just contexts.

**Rationale**: Keeps the engine dynamic and uniform — one table, one CRUD surface,
one award path. Adding a future context (e.g. `exam`) is a value, not a new table.

**Alternatives considered**: Three tables (lesson-rule, recitation-rule,
attendance-rule) — rejected: triplicates CRUD, queries, and UI for no benefit.

---

## D2 — Automatic dinars are **projections** of their source, replaced in place

**Decision**: Manual/exceptional dinars form an **immutable ledger** (corrections =
compensating reversal entries, preserving who-did-what audit). Automatic dinars
(attendance, recitation) are **projections** of a source record: when the source
changes, the projection is **updated/deleted in place** — no compensating entry.

**Rationale**: Verified in code that `DrizzleAttendanceRepository.upsertSession`
`DELETE`s the session (records cascade) and re-`INSERT`s with fresh IDs on every
re-take. Attendance record/session IDs are therefore **not stable**, so we cannot
anchor an audit entry to them. The audit for attendance already lives in the
attendance module; the dinar is a pure derived value, so replacing it in place is
correct and keeps the student ledger free of "+2 / −8 / reversal" churn every time a
teacher fixes a mark.

**Alternatives considered**:
- Compensating reversal entries for automatic too — rejected: pollutes the student's
  history with reversals on every attendance correction.
- Anchoring to `attendance_record.id` — rejected: IDs are regenerated on upsert.

**Refines**: FR-009/FR-012 — reversal-entries apply to *manual* awards; *automatic*
awards reconcile by replacement.

---

## D3 — Natural-key idempotency via `(source_type, source_ref, student_id)`

**Decision**: `dinar_transactions` carries `source_type`, `source_ref` (text, nullable),
`student_id`. A **partial unique index** on `(source_type, source_ref, student_id)`
(where `source_ref IS NOT NULL`) guarantees exactly one automatic dinar per source
per student. Keys:
- attendance → `source_ref = "{classId}:{date}"` (matches the `one_session_per_class_per_day` unique index)
- recitation → `source_ref = recitationId`
- manual/exceptional → `source_ref = NULL` (many rows coexist)

**Rationale**: Stable across attendance re-takes; lets the sync use-case diff current
vs desired state and act only on changes.

**Alternatives considered**: A dedicated `attendance_dinars` link table — rejected:
splits the ledger; `SUM(amount)` would need a union.

---

## D4 — Balance is `SUM(amount)`, computed on read

**Decision**: No stored/materialised balance. `DinarBalance` = `SUM(amount)` over the
student's transactions; positive/negative subtotals via conditional sums.

**Rationale**: Reversal entries net to zero and replaced projections update in place,
so the sum is always authoritative. An index on `(institute_id, student_id)` meets
SC-003/SC-004 at the stated scale (hundreds of rows/student, ≤100 students/class).
Matches the spec assumption; revisit with a cache only if a real bottleneck appears.

**Alternatives considered**: A `student_balance` column kept in sync — rejected:
extra write path and drift risk for no measured need.

---

## D5 — System rules seeded lazily per institute

**Decision**: The nine system rules (attendance: present/absent/late/justified;
recitation: excellent/very_good/good/acceptable/weak) are **upserted with defaults
on first read** of the rules config for an institute — `amount = 0`, `active = false`,
`protected = true`. Managers then set amounts and activate.

**Rationale**: Mirrors the established `LessonSettings` "load-or-default / upsert"
pattern from spec 009. Avoids a data-migration backfill for existing institutes and
keeps new institutes working with zero setup. `active=false` default means **nothing
auto-awards until a manager opts in** — safe by default.

**Alternatives considered**: Seed on institute creation via migration — rejected:
needs backfill + couples dinars to the institute-creation path.

---

## D6 — Integration seam: source modules call an exported dinars use-case

**Decision**: `AttendanceModule` and `RecitationsModule` `import` `DinarsModule` and
inject the exported `SyncAttendanceDinarsUseCase` / `ApplyRecitationDinarUseCase`,
calling them **after** they persist their own data. `DinarsModule` imports Users,
Classes, Institutes — never attendance/recitations.

**Rationale**: Matches the existing cross-module pattern (e.g. `RecitationsModule`
imports `UsersModule`/`ClassesModule` and injects their providers). One-way
dependency → no cycle. The codebase has no event bus; introducing one is unjustified
scope.

**Alternatives considered**: Domain-event bus — rejected: new infrastructure, not
warranted. Duplicating dinar logic inside attendance/recitation — rejected: violates
Clean Architecture boundaries.

---

## D7 — Award authorisation: teacher shares a class with the student

**Decision**: `dinar-award.policy.canAwardStudent(actor, student)`:
- `super_admin` → allow.
- `institute_manager` assigned to the student's institute → allow (`assertManagerOf`).
- `teacher` in the student's institute AND teaching a class the student is enrolled in
  → allow, via `ClassRepository.findCurrentClassOfStudent(studentId)` +
  `isTeacherOfClass(classId, actor.userId)`.
- otherwise deny.

**Rationale**: Reuses existing `InstituteAccessPolicy` + `ClassRepository`
capabilities; enforces FR-004/FR-008 server-side. Students never award.

**Alternatives considered**: "any staff of the institute" for teachers — rejected:
the spec restricts teachers to their own classes.

---

## D8 — Exceptional awards and reversal semantics

**Decision**: An **exceptional** award has `source_type = exceptional`, no `rule_id`,
a signed non-zero `amount`, and a **required** `reason` (≤ 200). A **reversal** creates
a compensating row (`amount = -original`, `source_type = manual_rule`/`exceptional`
carried over, `reverses_id = original.id`) and stamps `reversed_at` on the original;
an already-reversed or automatic row cannot be reversed (guarded in the use-case).

**Rationale**: Preserves audit (both rows visible), keeps `SUM` correct, and enforces
"reversible at most once" (FR-012).

---

## D9 — Recitation edit/delete deferred

**Decision**: Recitations currently expose only *add* + reads (no edit/delete endpoint
or repo method). `ApplyRecitationDinarUseCase` runs on add. The `source_ref =
recitationId` link makes future delete-reconciliation trivial, but we do **not** add
recitation delete/edit in this feature.

**Rationale**: Adding recitation mutation is out of scope; honest boundary. Spec US3
scenario 4 (delete reverses) is satisfied by design-readiness and will activate when
a delete capability ships.

---

## D10 — Frontend reuse map

**Decision**: Reuse `Button`, `Dialog`, `Input`, `Select`, `Badge`, `DropdownMenu`,
`EmptyState`, `ConfirmDialog`, list skeletons. New composed components: `DinarBadge`
(signed pill using `success`/`destructive` tokens) and `AwardDinarDialog` (shared by
the lesson timer page, student profile, and class roster for single & bulk awards).
Student Dinars tab mirrors the existing recitation/attendance profile tabs.

**Rationale**: Constitution V (no duplicated primitives); consistent UX; least code.
