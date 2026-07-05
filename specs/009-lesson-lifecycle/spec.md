# Feature Specification: Lesson Lifecycle — الدرس من البداية إلى النهاية

**Feature Branch**: `009-lesson-lifecycle`

**Created**: 2026-07-04

**Status**: Draft

**Input**: Lesson lifecycle: ordering, expected duration, status machine (pending→started→finished/not_given/over_time/under_time), teacher start/end flow with live timer page, and per-institute lesson settings (duration threshold, disable over/under-time feature)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Manager schedules a lesson with expected duration (Priority: P1)

When creating or editing a lesson, the manager optionally sets how many minutes the lesson is expected to take. This information is then used by the system to evaluate whether the teacher delivered the lesson within the planned time.

**Why this priority**: Expected duration is the foundation for the entire status machine; every other story depends on this data being present.

**Independent Test**: A manager can create a lesson with `expectedDurationMinutes = 45`, view it in the program, and see it listed with a duration badge. This is fully testable without the timer flow.

**Acceptance Scenarios**:

1. **Given** a manager is creating a lesson, **When** they set the expected duration to 45 minutes, **Then** the lesson is saved with that duration and it appears on the lesson card.
2. **Given** a manager creates a lesson without an expected duration, **When** the lesson is viewed, **Then** no duration badge is shown and the over/under-time evaluation is skipped for that lesson.
3. **Given** an existing lesson has an expected duration, **When** the manager edits and clears it, **Then** the lesson is saved with no duration and the status reverts to plain `finished` logic.

---

### User Story 2 — Teacher starts and ends a lesson with a live timer (Priority: P1)

A teacher assigned to a lesson sees a "Start lesson" button when the lesson day has arrived. Pressing it records the exact start time, starts a visible live timer, and locks the lesson in the `started` state. When the teacher presses "End lesson", the actual duration is calculated, the final status is determined, and the lesson is locked.

**Why this priority**: This is the core interactive flow; without it the status machine cannot advance beyond `pending`.

**Independent Test**: A teacher can start a lesson, see the timer count up in real time, end the lesson, and immediately see the lesson status update to `finished` (or over/under time if applicable). Fully testable against a lesson with a known expected duration.

**Acceptance Scenarios**:

1. **Given** a teacher is assigned to a lesson whose date is today or earlier and status is `pending`, **When** they press "Start", **Then** the actual start time is recorded, status becomes `started`, and the live timer begins.
2. **Given** a lesson is `started`, **When** the teacher presses "End lesson", **Then** the actual end time is recorded and the final status is derived (see FR-006).
3. **Given** a lesson is already `started` by the teacher, **When** another device opens the same teacher session, **Then** the timer continues from the correct start time (no reset).
4. **Given** a teacher tries to start a lesson whose date has not arrived yet, **Then** the start button is hidden or disabled.
5. **Given** a lesson is `finished`, **When** the teacher views it, **Then** the start/end buttons are hidden and actual duration is shown.

---

### User Story 3 — Lesson automatically becomes "Not Given" when skipped (Priority: P2)

If a lesson day passes without the teacher pressing "Start", the lesson transitions to the `not_given` state. This is visible to the manager in the program view, providing accountability.

**Why this priority**: Accountability visibility for managers is important, but it is a read-concern that does not block the teacher flow.

**Independent Test**: A lesson whose date is yesterday and whose status is still `pending` is displayed as `not_given` in the lesson program.

**Acceptance Scenarios**:

1. **Given** a lesson's date is in the past and status is `pending`, **When** the manager views the lesson program, **Then** the lesson is shown with status `not_given`.
2. **Given** a teacher views their "دروسي" list, **When** past-date lessons are present with status `pending`, **Then** they appear as `not_given`.
3. **Given** a lesson becomes `not_given`, **When** the manager checks the overview, **Then** the `not_given` count is reflected in institute statistics (future extension, not in this spec).

---

### User Story 4 — Over-time and under-time status evaluation (Priority: P2)

When a teacher ends a lesson that has an expected duration, the system compares actual duration against expected. If the difference exceeds the configured threshold (default 10 minutes), the lesson receives `over_time` or `under_time` status instead of `finished`. The manager can adjust the threshold or disable this evaluation entirely in lesson settings.

**Why this priority**: Delivers the educational quality-assurance value of the feature, but is secondary to the core start/end flow.

**Independent Test**: End a lesson that ran 15 minutes over its expected duration with a threshold of 10 minutes — it should receive status `over_time`. Then disable the threshold in settings and end another identical lesson — it should receive `finished`.

**Acceptance Scenarios**:

1. **Given** the threshold is 10 min and a lesson with `expectedDurationMinutes = 45` ran for 57 min, **When** the teacher ends it, **Then** status becomes `over_time` (تجاوز الوقت المخصص).
2. **Given** the threshold is 10 min and a lesson ran for 33 min (12 min short), **When** the teacher ends it, **Then** status becomes `under_time` (أقل من الوقت المخصص).
3. **Given** a lesson ran exactly within threshold (±9 min), **When** the teacher ends it, **Then** status is `finished`.
4. **Given** the manager has disabled the over/under-time feature in lesson settings, **When** the teacher ends any lesson, **Then** status is always `finished` regardless of actual vs expected duration.
5. **Given** a lesson has no expected duration, **When** the teacher ends it, **Then** status is always `finished` regardless of threshold settings.

---

### User Story 5 — Manager configures lesson settings per institute (Priority: P3)

A manager has a dedicated settings area for the lessons module. From here they can: manage lesson categories, configure the duration-comparison threshold, and toggle the over/under-time evaluation feature on or off. The "show lessons to students" toggle also lives here.

**Why this priority**: Settings refine the experience; defaults (10 min, enabled) are sensible so the feature ships without this being blocking.

**Independent Test**: A manager opens lesson settings, changes the threshold to 15 minutes, and verifies that the new threshold is applied the next time a lesson is ended.

**Acceptance Scenarios**:

1. **Given** a manager opens lesson settings, **When** they change the threshold from 10 to 20 minutes and save, **Then** subsequent lesson-end evaluations use 20 minutes.
2. **Given** a manager toggles "evaluate over/under-time" off, **When** a teacher ends a lesson that ran 30 minutes over expected, **Then** the status is `finished`, not `over_time`.
3. **Given** a manager opens the settings page, **When** they manage categories (add/edit/delete), **Then** the changes are reflected immediately in the add-lesson dialog.
4. **Given** a manager toggles "show lessons to students" at the institute level (affects all classes), this setting persists correctly. *(Per-class toggle remains separate.)*

---

### Edge Cases

- What if the teacher's device loses connectivity mid-lesson (timer page open)? The timer continues client-side using the recorded start time; end is submitted when connectivity is restored.
- What if two teachers are assigned to the same lesson class binding? Only the assigned teacher for that specific `lesson_class` binding can start/end it.
- What if the expected duration is 0 or negative? Validation must reject this — minimum is 1 minute.
- What if a manager edits the expected duration after the lesson has `started` or `finished`? Changes to expected duration are blocked once the lesson is `started`; the evaluation uses the duration at start time.
- What if a teacher refreshes or reopens the timer page? The timer must reconstruct itself from the stored `actualStartTime` — no second start is created.
- What happens when the threshold is set to 0? Treated as "disabled" — all finished lessons get `finished` status.

---

## Requirements *(mandatory)*

### Functional Requirements

**Lesson creation / editing**

- **FR-001**: When creating a lesson, a manager MAY set `expectedDurationMinutes` (positive integer, minimum 1). The field is optional; lessons without a duration are valid.
- **FR-002**: The `expectedDurationMinutes` field MUST be editable only while the lesson status is `pending`. Once `started`, this field is locked.
- **FR-003**: Lessons in the same day MUST display an explicit ordinal number (1, 2, 3…) based on their `sort` position, visible on all lesson cards and in the teacher timer page.

**Status machine**

- **FR-004**: Every lesson MUST carry one of these six statuses: `pending`, `started`, `finished`, `not_given`, `over_time`, `under_time`.
- **FR-005**: A lesson's initial status on creation is `pending`.
- **FR-006**: Status transitions are:

  | From | To | Trigger |
  |------|----|---------|
  | `pending` | `started` | Teacher presses "Start" on lesson day |
  | `pending` | `not_given` | Lesson date has passed and teacher never started it |
  | `started` | `finished` | Teacher presses "End"; actual duration is within threshold of expected (or no expected duration, or threshold disabled) |
  | `started` | `over_time` | Teacher presses "End"; actual duration exceeds expected by more than threshold |
  | `started` | `under_time` | Teacher presses "End"; actual duration is less than expected by more than threshold |

- **FR-007**: The `not_given` transition is evaluated lazily on read: any `pending` lesson whose date is strictly before today is returned as `not_given` without a write operation. A scheduled background job MAY persist this status daily for reporting accuracy.
- **FR-008**: `finished`, `over_time`, `under_time`, and `not_given` are terminal — no further transitions are allowed.
- **FR-009**: `actualStartTime` is recorded (server-side timestamp) when a teacher presses "Start".
- **FR-010**: `actualEndTime` is recorded (server-side timestamp) when a teacher presses "End".

**Teacher timer page**

- **FR-011**: When a teacher presses "Start", they MUST be navigated to a dedicated lesson timer page.
- **FR-012**: The timer page MUST display: lesson name / kind, date, expected duration (if set), a live elapsed timer counting up from `actualStartTime`, and the ordinal position of the lesson in its day.
- **FR-013**: The timer page MUST show an "End lesson" confirmation action that requires explicit confirmation before finalising.
- **FR-014**: If the teacher navigates away and returns, the timer page MUST reconstruct the elapsed time from `actualStartTime`; it does not restart.
- **FR-015**: The "Start" button on a lesson is only shown when: the lesson date is today or earlier, the status is `pending`, and the current user is the teacher assigned to that specific `lesson_class` binding.

**Over/under-time evaluation**

- **FR-016**: At lesson end, if `expectedDurationMinutes` is set AND the duration-status feature is enabled AND the threshold > 0: compare `actualMinutes` (ceiling of elapsed seconds / 60) against `expectedDurationMinutes`. If `actualMinutes > expected + threshold` → `over_time`; if `actualMinutes < expected - threshold` → `under_time`; otherwise → `finished`.
- **FR-017**: If the threshold feature is disabled or the threshold is 0 or `expectedDurationMinutes` is null, the final status is always `finished`.

**Lesson settings (per institute)**

- **FR-018**: Each institute MUST have a `LessonSettings` record with: `durationThresholdMinutes` (integer, default 10, minimum 0) and `durationStatusEnabled` (boolean, default true).
- **FR-019**: Managers MUST be able to update lesson settings for their institute.
- **FR-020**: The lesson settings page MUST also expose: lesson category management (moved from the hub toolbar) and the "show lessons to students" toggle (currently per-class — also expose a global institute-level default here).

### Key Entities

- **Lesson** (extended): adds only `expectedDurationMinutes (nullable int)` to the existing `lessons` table. This is shared content metadata authored by the manager. Status and actual timestamps do NOT live here — they are per-delivery (see LessonClassBinding).
- **LessonClassBinding** (extended): `status`, `actualStartTime`, and `actualEndTime` live on the `lesson_classes` binding, not the shared lesson, because the same lesson may be delivered by different teachers to different classes at different times. Each binding tracks its own delivery state independently.
- **LessonSettings**: per-institute record — `instituteId (FK)`, `durationThresholdMinutes (int default 10)`, `durationStatusEnabled (bool default true)`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher can start a lesson and see an accurate live timer within 1 second of pressing "Start".
- **SC-002**: The correct final status (`finished`, `over_time`, `under_time`) is assigned in 100% of cases when a teacher ends a lesson with a known expected duration.
- **SC-003**: Past pending lessons appear as `not_given` in the program view without any manual manager action.
- **SC-004**: A manager can change the threshold or disable duration evaluation, and the change takes effect for the very next lesson ended.
- **SC-005**: The lesson timer page correctly reconstructs elapsed time after a page refresh with zero additional server requests beyond the initial page load.

---

## Assumptions

- The `sort` field for lesson ordering already exists in the `lesson_classes` table from spec 008; this spec reuses it for the display ordinal.
- `not_given` is evaluated lazily on read (no migration required for existing lessons).
- The timer page is a dedicated frontend route accessible only to the assigned teacher for that binding.
- The lesson settings `LessonSettings` record is created with defaults on first use (upsert); no migration to pre-populate existing institutes is needed — defaults apply transparently.
- Per-class "show lessons to students" toggles from spec 008 remain independent; the institute-level default in settings only affects newly created classes.
- `expectedDurationMinutes` is locked once `started` to ensure the evaluation is deterministic; this is a one-way lock.
- The threshold comparison is inclusive: `actualMinutes === expected + threshold` is `finished`, not `over_time` (strictly greater than triggers `over_time`).
