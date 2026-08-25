# Feature Specification: Dinars — Student Rewards Currency (نظام الدنانير)

**Feature Branch**: `010-dinars`

**Created**: 2026-07-07

**Status**: Draft

**Input**: A dynamic rules-based rewards currency called "Dinars" (دنانير). The institute manager defines rules and the dinar value of each. Rules come in contexts: **in-lesson** (teacher awards during a lesson — e.g. distinguished participation, disruption), **in-recitation** (during تسميع), and **automatic system** rules (attendance/absence) that fire from system events but whose dinar amounts are set dynamically by the manager. Values can be positive or negative. Teachers award dinars by picking a rule (or an exceptional custom amount with a reason). Students see their positive/negative dinars and balance. Leaderboard ranks students per class or institute.

---

## Glossary

- **Dinar (دينار)**: the reward-currency unit. A student accumulates a **balance** (net sum) that can be positive or negative.
- **Rule (قاعدة)**: a named, reusable definition carrying a signed dinar **amount** and a **context**. The single dynamic unit of the system.
- **Context**: where a rule applies — `lesson`, `recitation`, or `attendance`.
- **Trigger**: how a rule fires — `manual` (a teacher/manager awards it) or `automatic` (the system awards it from an event such as marking attendance or logging a recitation).
- **System rule (قاعدة نظام)**: a seeded, protected `automatic` rule slot (e.g. "attendance: absent") whose amount and on/off state the manager configures but which cannot be deleted or re-contexted.
- **Transaction / ledger entry (حركة)**: one immutable award or deduction applied to a student, with a snapshot of the rule name and amount at the time it was applied.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manager Defines & Configures Dinar Rules (Priority: P1)

The manager sets up the rule catalogue that powers everything else. They create **manual rules** freely — giving each a name, a signed dinar amount, and a context (`lesson` or `recitation`) — for example "مشاركة مميزة" (+5, lesson) or "شغب" (−10, lesson). They also configure the **system rules**: a fixed, non-deletable set of `automatic` slots for the four attendance statuses (present, absent, late, justified) and the five recitation ratings (excellent → weak). For each system rule the manager sets its dinar amount and whether it is active.

**Why this priority**: Nothing awards dinars until rules exist. This is the dynamic engine at the heart of the feature.

**Independent Test**: A manager can create/edit/delete manual rules and configure amounts for the seeded system rules. Manual rules become available to teachers; system rules take effect on the corresponding events. Deleting a manual rule that has history is prevented; system rules cannot be deleted at all.

**Acceptance Scenarios**:

1. **Given** a manager is logged in, **When** they create a lesson rule "مشاركة مميزة" (+5), **Then** it appears in the rule catalogue and becomes selectable by teachers awarding dinars during a lesson.
2. **Given** a manager opens the system rules, **When** they set "absence" to −8 and mark it active, **Then** future absences deduct 8 dinars automatically.
3. **Given** a manager sets the recitation "excellent" rule to +10, **When** a teacher later logs an excellent recitation, **Then** the student automatically receives 10 dinars.
4. **Given** a manual rule already has award history, **When** the manager tries to delete it, **Then** the system rejects the deletion (they may deactivate it instead).
5. **Given** a manager tries to delete a system rule, **Then** the system rejects it — system rules can only be deactivated or re-valued.
6. **Given** a manager edits a rule's amount from +5 to +3, **Then** new awards use +3 while existing history keeps +5.
7. **Given** a manager of institute A, **When** they view rules, **Then** they see only institute A's rules.

---

### User Story 2 — Staff Award Manual Dinars (Priority: P1)

During a live lesson (the timer/counter page) or from a student's or class profile at any time, a teacher awards dinars to a student in one of two ways: (a) pick an existing manual rule, applying its amount, or (b) award an **exceptional** custom amount (positive or negative) with a **mandatory reason**. A teacher may award the same rule to several students at once (bulk). A teacher can only award students in classes they teach; a manager can award any student in their institute. Any manual award can be reversed by its author or a manager, producing a compensating entry.

**Why this priority**: The daily action that makes the system useful. Tied P1 with rules, since without awards there is no data.

**Independent Test**: A teacher awards a rule and an exceptional amount, single and bulk; balances update immediately and entries appear in history. A teacher is blocked from awarding students outside their classes. A reversal produces a visible compensating entry.

**Acceptance Scenarios**:

1. **Given** a teacher is on the live lesson page, **When** they select "مشاركة مميزة" (+5) for a student and confirm, **Then** the student's balance rises by 5 and a ledger entry is recorded with the teacher's name and lesson context.
2. **Given** a teacher selects three students and applies "مشاركة مميزة" (+5) at once, **Then** each of the three receives a separate +5 entry.
3. **Given** a teacher chooses "exceptional" and enters −6 with reason "إتلاف أداة", **Then** the student's balance falls by 6 and the reason is stored; **and** if the reason is empty the system rejects the award.
4. **Given** a teacher opens a student's profile outside any lesson, **When** they award a rule, **Then** the award succeeds with `general` context.
5. **Given** a teacher tries to award a student not in their classes, **Then** the system rejects it.
6. **Given** a manager opens any student's profile in their institute, **When** they award or deduct dinars, **Then** it succeeds.
7. **Given** a teacher awarded dinars by mistake, **When** they (or a manager) reverse that entry, **Then** a compensating entry is created and the net balance returns to its prior value; the original entry remains visible for audit.
8. **Given** an exceptional custom amount, **When** the reason exceeds 200 characters, **Then** the system rejects it.

---

### User Story 3 — Automatic Dinars from Attendance & Recitation (Priority: P2)

When a teacher marks a student's attendance, the system automatically applies the active attendance system rule matching that status (present/absent/late/justified). When a teacher logs a recitation, the system automatically applies the active recitation system rule matching that rating (excellent → weak). Each automatic entry is tied to its source record so that **editing the source reconciles the dinars without duplication**: changing attendance from absent to present reverses the absent deduction and applies the present reward; deleting a recitation reverses its dinars.

**Why this priority**: High-value automation that removes manual effort, but it depends on rules (US1) existing and on the attendance/recitation modules already in place.

**Independent Test**: Marking/altering attendance and logging/editing/deleting recitations correctly creates, updates, and reverses dinar entries with no double counting, and only when the matching rule is active.

**Acceptance Scenarios**:

1. **Given** the "absent" rule is −8 and active, **When** a teacher marks a student absent for a lesson, **Then** the student receives one −8 entry linked to that attendance record.
2. **Given** a student was marked absent (−8), **When** the teacher corrects the status to present (+2), **Then** the −8 is reversed and a +2 is applied — net effect +2, with no leftover −8.
3. **Given** the "excellent" recitation rule is +10 and active, **When** a teacher logs an excellent recitation, **Then** the student receives +10 linked to that recitation.
4. **Given** an auto-awarded recitation, **When** the recitation is deleted, **Then** its dinar entry is reversed.
5. **Given** an attendance system rule is inactive, **When** a matching attendance is marked, **Then** no dinar entry is created.
6. **Given** attendance is re-saved with the same status, **Then** no duplicate dinar entry is created (idempotent).

---

### User Story 4 — Student Views Balance & History (Priority: P2)

A student logs in and sees their current **net balance** prominently, along with totals of positive and negative dinars. Below, they browse a reverse-chronological ledger of every entry: date, rule name (or reason for exceptional), amount, context, and the awarding teacher. Students see only their own data.

**Why this priority**: Transparency and motivation. Requires data from US1–US3 to exist first.

**Independent Test**: A student sees an accurate net balance, positive/negative totals, and a complete history; they cannot view another student's dinars.

**Acceptance Scenarios**:

1. **Given** a student has +5, +10, and −8 entries, **When** they open their dinars page, **Then** the net balance shows +7, positive total +15, negative total −8, and all three entries listed newest-first.
2. **Given** a student's net balance is negative, **Then** it is displayed clearly as negative (not hidden or floored).
3. **Given** student A is logged in, **When** they try to access student B's dinars, **Then** they are denied.
4. **Given** a student has no entries, **Then** the balance shows 0 with an empty-state message.

---

### User Story 5 — Leaderboard (Priority: P3)

Managers and teachers view a ranked list of students by net dinar balance, for a specific class or across the whole institute. The board shows rank, student name, and balance; ties share a rank.

**Why this priority**: Motivational, not required for daily operation; depends on all prior stories having data.

**Independent Test**: A manager views a per-class and institute-wide ranking; a teacher sees only classes they teach.

**Acceptance Scenarios**:

1. **Given** a class of 5 students with different balances, **When** a manager or teacher views the class leaderboard, **Then** students are ranked by descending balance with ties sharing a rank.
2. **Given** a manager views the institute leaderboard, **Then** all students across classes are ranked by balance.
3. **Given** a teacher views the leaderboard, **Then** only their classes are available (not the whole institute).

---

### Edge Cases

- **Student transferred between classes** — balance follows the student, not the class.
- **Teacher removed from a class** — their past entries remain visible and immutable; the recorded teacher name is preserved.
- **Rule deactivated after use** — existing history stays; the rule is no longer selectable and no longer fires (system rules) but is not deleted.
- **Rule amount edited** — historical entries keep the value at the time of award (snapshot).
- **Attendance/recitation edited or deleted** — linked automatic dinars reconcile (reverse/re-apply) with no duplication.
- **Balance below zero** — allowed; the net reflects the arithmetic sum.
- **Same rule awarded repeatedly** — each manual award is an independent entry.
- **Reversal of an already-reversed entry** — blocked; an entry can be reversed at most once.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Managers MUST be able to create, edit, and delete **manual** rules (context `lesson` or `recitation`), each with a name (≤ 100 chars) and a non-zero signed integer amount.
- **FR-002**: The system MUST provide a seeded, non-deletable set of **system** rules — four attendance statuses (present, absent, late, justified) and five recitation ratings (excellent, very_good, good, acceptable, weak) — for which managers configure the amount and active state.
- **FR-003**: The system MUST prevent deletion of any manual rule that has associated history (managers may deactivate instead); system rules MUST never be deletable.
- **FR-004**: Teachers MUST be able to award any active manual rule to students in their classes; managers MUST be able to award any student in their institute.
- **FR-005**: Staff MUST be able to award an **exceptional** dinar amount (non-zero signed integer) with a **mandatory reason** (≤ 200 chars), independent of any rule.
- **FR-006**: Teachers MUST be able to award a single rule to multiple students in one action (bulk), producing one entry per student.
- **FR-007**: Manual awarding MUST be available both during a live (started) lesson and from a student/class profile at any time.
- **FR-008**: The system MUST enforce that a teacher only awards students in classes they teach; managers are scoped to their institute.
- **FR-009**: When attendance is saved for a student, the system MUST apply the active attendance system rule matching the status, tied to the attendance record; if the status later changes, it MUST reconcile (reverse the prior and apply the new) without duplication; if the rule is inactive, no entry is created.
- **FR-010**: When a recitation is logged, the system MUST apply the active recitation system rule matching the rating, tied to the recitation record; editing or deleting the recitation MUST reconcile the linked dinars.
- **FR-011**: Every ledger entry MUST store a snapshot of the rule name (or reason) and amount at the time of award, so later rule edits do not alter history.
- **FR-012**: Staff MUST be able to reverse a manual entry they authored (managers: any entry), creating a compensating entry; an entry MUST be reversible at most once and the original remains visible.
- **FR-013**: Students MUST be able to view their own net balance, positive total, negative total, and full reverse-chronological history (date, rule name/reason, amount, context, awarding teacher).
- **FR-014**: The system MUST restrict students to their own dinar data.
- **FR-015**: Managers and teachers MUST be able to view a leaderboard ranked by net balance — managers institute-wide or per-class, teachers limited to their classes; ties share a rank.
- **FR-016**: All rules and entries MUST be scoped to the institute; no cross-institute leakage.
- **FR-017**: Managers MUST be able to view any student's full history within their institute.

### Key Entities

- **DinarRule**: institute-owned rule — name, signed non-zero amount, context (`lesson` | `recitation` | `attendance`), trigger (`manual` | `automatic`), optional system key (for seeded rules), active flag, protected flag (true for system rules).
- **DinarTransaction**: immutable ledger entry — student, signed amount (snapshot), rule reference and rule-name snapshot (null for exceptional), context, trigger, optional source link (attendance record / recitation / lesson binding) for automatic reconciliation, awarding staff member, optional reason, optional reversal link, timestamp, institute.
- **DinarBalance**: derived — the arithmetic sum of a student's transactions (net, plus positive/negative subtotals); computed on read, not stored.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A manager can create a manual rule and a teacher can award it to a student in under 60 seconds total.
- **SC-002**: Awarding a rule to a single student during a lesson reflects in the student's balance within 2 seconds.
- **SC-003**: A student's balance and history page loads in under 2 seconds for histories up to 500 entries.
- **SC-004**: The leaderboard for a class of up to 100 students loads and ranks correctly in under 2 seconds.
- **SC-005**: 100% of automatic attendance/recitation edits reconcile correctly — zero duplicate or orphaned dinar entries across status/rating changes.
- **SC-006**: 100% of manual awards enforce teacher-to-class membership (zero cross-class awards permitted by the system).
- **SC-007**: Deactivated/deleted rules block new awards while existing history remains visible and unchanged.

---

## Assumptions

- **Terminology**: the currency is "dinars" (دنانير); earlier drafts called it "points" — corrected here.
- **No store this release**: dinars are tracked (balance, history, leaderboard) but not spendable; a rewards store is deferred to a future spec.
- **No parent role**: the platform has no parent user role; parent access is deferred. Students view their own data.
- **Recitation dinars are both automatic and manual**: the five existing recitation ratings drive automatic dinars, and managers may additionally define manual recitation rules for teachers to award.
- **Attendance statuses**: the existing four (present, absent, late, justified) each map to a configurable system rule.
- **Balance is computed**, not stored, as the arithmetic sum of transactions; a cached/materialised total may be introduced during planning if performance requires.
- **Value snapshot**: transactions store the rule name and amount at award time; later rule edits never alter history.
- **Reversal model**: corrections are compensating entries, not edits/deletes of history; each entry is reversible once.
- **Negative balances are allowed**; there is no daily award cap in this release.
- **Integer dinars only** (no decimals); rule amounts and balances are whole numbers.
- **Rules are institute-scoped** and shared across all classes of the institute.
