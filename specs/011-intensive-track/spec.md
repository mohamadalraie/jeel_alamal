# Feature Specification: Intensive Track — المسار المكثف (spec 011)

**Feature Branch**: `011-intensive-track`
**Created**: 2026-09-24
**Status**: Approved

---

## Glossary

- **Intensive Track (مسار مكثف)**: An optional second attendance-and-teaching track activated per-institute. It hosts its own classes, but students' dinars, recitations, notes, and combined attendance statistics are unified in one student profile.
- **Intensive Class (حلقة مكثفة)**: A `classes` row flagged as belonging to the intensive track (`is_intensive = true`). Independent teacher(s), schedule, and lesson programme from the regular class.
- **Regular Class (حلقة أساسية)**: An existing `classes` row — no change required.
- **Intensive Student**: A student enrolled in *both* a regular class (`class_students`) *and* exactly one intensive class (`class_intensive_students`).

---

## Business Rules

| ID | Rule |
|----|------|
| BR-1 | Each institute has at most one intensive track (enabled/disabled by the manager). |
| BR-2 | A student may not be added to an intensive class unless they are already enrolled in a regular class in the same institute. |
| BR-3 | A student may be in exactly one intensive class. |
| BR-4 | An intensive class is a regular `classes` record with `is_intensive = true`; all existing class logic (teachers, schedule, lessons, attendance, dinars) applies unchanged. |
| BR-5 | Attendance statistics for an intensive student are computed over **all** their attendance records (regular + intensive sessions) combined. |
| BR-6 | Dinars, recitations, and student notes are already scoped to a student — no change needed; they naturally accumulate across both tracks. |
| BR-7 | Deleting/disabling a student from the regular class must remove them from any intensive class first (or the operation is blocked until they are removed from the intensive class). |
| BR-8 | Only `institute_manager` (and `super_admin`) may enable/disable the intensive track or enroll students in intensive classes. The supervising teacher of an intensive class may also enroll students. |

---

## User Stories & Acceptance Scenarios *(mandatory)*

### US-1 — Manager enables the intensive track (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the manager is on the institute settings page, **When** they toggle "تفعيل المسار المكثف", **Then** `intensiveTrackEnabled` becomes `true`, a new "المسار المكثف" section appears in the sidebar, and they can create intensive classes.
2. **Given** the track is disabled, **When** the manager tries to create an intensive class via the API, **Then** the server returns `403 Forbidden`.
3. **Given** the track is enabled, **When** another institute's manager calls the toggle endpoint for this institute, **Then** the server returns `403 Forbidden` (tenant isolation).

---

### US-2 — Manager creates and manages intensive classes (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the intensive track is enabled, **When** the manager creates an intensive class, **Then** a `classes` row with `is_intensive = true` is inserted, scoped to the institute.
2. **Given** an intensive class exists, **When** the manager assigns a teacher, sets a schedule, and adds lessons, **Then** all existing class-management flows work identically.
3. **Given** an intensive class list page, **When** a teacher (non-supervisor) views it, **Then** they see only intensive classes they are assigned to.

---

### US-3 — Manager/supervisor enrolls students in the intensive track (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a student is in a regular class, **When** the manager adds them to an intensive class, **Then** a `class_intensive_students` row is inserted and the student's profile shows an "المسار المكثف" badge.
2. **Given** a student has **no** regular class, **When** the manager tries to add them to an intensive class, **Then** the server returns `422 Unprocessable Entity` with message "Student must be enrolled in a regular class first" (BR-2).
3. **Given** a student is already in one intensive class, **When** the manager tries to add them to a second intensive class, **Then** the server returns `409 Conflict` (BR-3).
4. **Given** a manager of institute A, **When** they try to enroll a student from institute B into an intensive class of institute A, **Then** the server returns `403 Forbidden`.

---

### US-4 — Teacher takes attendance for an intensive class (Priority: P2)

**Acceptance Scenarios**:

1. **Given** an intensive class has a session today, **When** the teacher takes attendance, **Then** an `attendance_sessions` row is created with `track_type = 'intensive'`; student records are created as normal.
2. **Given** an intensive student's profile, **When** staff view their attendance statistics, **Then** the percentage is computed from total sessions across **all** their classes (regular + intensive).
3. **Given** a student has 10 regular sessions (8 present) and 5 intensive sessions (5 present), **Then** their combined attendance is 13/15 = 87%.

---

### US-5 — Student and staff views (Priority: P2)

**Acceptance Scenarios**:

1. **Given** an intensive student opens their profile, **Then** they see their regular class AND their intensive class, each with its own programme/schedule.
2. **Given** a student is NOT in the intensive track, **Then** no intensive class section appears in their profile.
3. **Given** a teacher who is NOT assigned to any intensive class, **When** they navigate to the intensive track section, **Then** they see an empty state (not a 403).

---

## Constitution Compliance Check

| Gate | Status | Notes |
|------|--------|-------|
| I. Clean Architecture — 4 layers | ✅ | No new top-level module needed. Changes live in existing modules: `institutes` (toggle), `classes` (new `is_intensive` column, filter), `attendance` (combined stats). Each use-case is new or a targeted extension in the correct layer. |
| II. Multi-tenancy — every mutation scoped to `institute_id` | ✅ | `is_intensive` flag on `institutes`; intensive classes carry `institute_id` as all classes do; enrollment checks institute membership. |
| III. RBAC — deny by default | ✅ | Toggle: `assertManagerOf`. Enroll student: `assertManagerOf` OR supervising teacher. View: staff of institute. |
| IV. JWT cookies, no client-sent `institute_id` | ✅ | `institute_id` always derived from the actor or from the class/student record server-side. |
| V. Component reuse | ✅ | New "المسار المكثف" section in sidebar reuses `Link` + layout primitives; intensive class pages reuse existing class-page components with an `isIntensive` flag/badge. No duplicate primitives. |
| VI. Semantic tokens only | ✅ | Intensive badge uses `accent`/`primary` token — no raw hex. |
| VII. ar RTL + en LTR, mobile-first | ✅ | All strings in `messages/{locale}.json` under `intensiveTrack` namespace. Logical Tailwind properties. |
| VIII. Drizzle migrations — no push | ✅ | Two SQL changes: `ALTER TABLE institutes ADD COLUMN intensive_track_enabled` + `ALTER TABLE classes ADD COLUMN is_intensive`. Generated via `db:generate`, reviewed, committed. |
| IX. Containerised | ✅ | No infra change. |
| X. Spec-driven | ✅ | This is spec `011-intensive-track`. |

---

## Data Model Changes

### `institutes` — add one column
```sql
ALTER TABLE "institutes"
  ADD COLUMN "intensive_track_enabled" boolean NOT NULL DEFAULT false;
```

### `classes` — add one column
```sql
ALTER TABLE "classes"
  ADD COLUMN "is_intensive" boolean NOT NULL DEFAULT false;
```

> `class_intensive_students` already exists. No new table required.

---

## Backend Changes (per module, per layer)

### `institutes` module

**Domain** (`institutes/domain/`):
- Add `intensiveTrackEnabled: boolean` to `Institute` entity.

**Application** (`institutes/application/`):
- New use-case: `ToggleIntensiveTrackUseCase` — `assertManagerOf` → toggle the flag → save.
- `GetInstituteUseCase` / DTO — expose `intensiveTrackEnabled`.

**Infrastructure** (`institutes/infrastructure/persistence/`):
- `institute.schema.ts` — add `intensiveTrackEnabled` column.
- `drizzle-institute.repository.ts` — include the new column in `save`/`findById`.

**Presentation** (`institutes/presentation/`):
- `PATCH /api/institutes/:id/intensive-track` — `{ enabled: boolean }` → `ToggleIntensiveTrackUseCase`.

---

### `classes` module

**Domain** (`classes/domain/`):
- Add `isIntensive: boolean` to `Class` entity.
- New repository port method: `findAllIntensiveByInstitute(instituteId)`.

**Application** (`classes/application/`):
- `CreateClassUseCase` — accept `isIntensive` flag; guard: track must be enabled if `isIntensive = true`.
- `ListClassesUseCase` — accept optional `track: 'regular' | 'intensive'` filter.
- `AddIntensiveStudentUseCase` (already exists) — add BR-2 check: student must be in a regular class in the same institute.
- New use-case: `ListIntensiveClassesUseCase` — `assertMemberOf` → filter `is_intensive = true`.

**Infrastructure** (`classes/infrastructure/persistence/`):
- `class.schema.ts` — add `isIntensive` column.
- `drizzle-class.repository.ts` — `findAllByInstitute` gains an optional `isIntensive` filter; `findAllIntensiveByInstitute` delegate.

**Presentation** (`classes/presentation/`):
- `GET /api/institutes/:id/classes?track=intensive` — list intensive classes only.
- `POST /api/institutes/:id/classes` — add `isIntensive` field to `CreateClassDto`.

---

### `attendance` module

**Application** (`attendance/application/`):
- `GetStudentAttendanceSummaryUseCase` (or its equivalent) — compute percentage across ALL classes the student belongs to (regular `class_students` + `class_intensive_students`), not just one class.

**Infrastructure** (`attendance/infrastructure/persistence/`):
- Query joining `class_students UNION class_intensive_students` to collect all classIds for a student, then aggregate sessions.

---

## Frontend Changes

### Sidebar / Navigation
- Add "المسار المكثف" link (shown only if `intensiveTrackEnabled === true`).
- Route: `/dashboard/intensive`.

### New Pages
- `/dashboard/intensive` — list of intensive classes (reuses class-card component + `isIntensive` badge).
- `/dashboard/intensive/[classId]` — reuses existing class-profile page; the page detects `isIntensive` and shows a badge in the header.

### Existing Pages — modifications
- `/dashboard/settings` (or institute settings) — toggle "تفعيل المسار المكثف".
- Student profile page — if student has an intensive class, show a second class card/row with a "مكثف" badge.
- Student attendance stats — already reads from the API; the API now returns the combined stat.
- `createClass` dialog — add "حلقة مكثفة؟" checkbox (shown only if `intensiveTrackEnabled`).

### i18n additions (`messages/ar.json` + `en.json`)
```json
"intensiveTrack": {
  "label": "المسار المكثف",
  "enable": "تفعيل المسار المكثف",
  "disable": "تعطيل المسار المكثف",
  "intensiveClass": "حلقة مكثفة",
  "badge": "مكثف",
  "emptyState": "لا توجد حلقات مكثفة بعد",
  "enrollStudent": "إضافة طالب للمسار المكثف",
  "errors": {
    "trackDisabled": "المسار المكثف غير مفعّل في هذا المعهد",
    "noRegularClass": "يجب أن يكون الطالب مسجلاً في حلقة أساسية أولاً",
    "alreadyEnrolled": "الطالب مسجل مسبقاً في مسار مكثف"
  }
}
```

---

## Implementation Phases

- **Phase A — DB migration**: `db:generate` → review `011_intensive_track.sql` → commit → `migration:run`.
- **Phase B — Backend: Institutes module** (toggle use-case + DTO + endpoint + schema).
- **Phase C — Backend: Classes module** (entity flag + create guard + list filter + BR-2 enforcement).
- **Phase D — Backend: Attendance** (combined stats query).
- **Phase E — Frontend data layer**: `types.ts` (add `isIntensive`, `intensiveTrackEnabled`) + `api.ts` + `queries.ts`.
- **Phase F — Frontend UI**: sidebar link + toggle + class creation dialog + class-profile badge + student-profile intensive card.
- **Phase G — i18n + polish**: both locales, both themes, mobile viewport, `npm run build`.
