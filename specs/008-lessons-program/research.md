# Phase 0 Research: Class Lessons Program

All major unknowns were resolved with the user before writing the spec (timeline model, time vs order, recitation kind, visibility). This document records the design decisions and the rationale, plus the integration patterns reused from the existing codebase. No `NEEDS CLARIFICATION` remain.

## D1 — Shared definition vs per-class copy (no duplication)

- **Decision**: Two tables. `lessons` holds the shared content **once**; `lesson_classes` holds one row **per class** (its own id + `teacher_id` + `sort`). Sources hang off the `lessons` definition. Scheduling for N classes = 1 `lessons` row + N `lesson_classes` rows.
- **Rationale**: Directly satisfies "details the same without duplication; the per-class lesson id may differ." Editing shared content touches one row; per-class teacher/order is independent and independently removable.
- **Alternatives considered**: (a) One row per class with duplicated content — rejected (duplication, divergence on edit). (b) JSON array of class assignments inside `lessons` — rejected (cannot give each binding its own id / FK integrity / per-class deletion cleanly).

## D2 — Recitation as a distinct kind

- **Decision**: `lessons.kind ∈ {lesson, recitation}`. For `recitation`, `name/description/category_id` are null and there are no sources; UI shows the fixed label "تسميع القرآن الكريم". It still has a date and per-class teacher via `lesson_classes`.
- **Rationale**: User said it "doesn't need sources or description or name — it's just تسميع للقرآن الكريم." A kind flag keeps it in the same program/timeline and the same teacher "my lessons" feed without a parallel table.
- **Alternatives**: Separate `recitation_entries` table — rejected (duplicates the date+class+teacher binding and the program/teacher-feed queries). A category named "تسميع" — rejected (user explicitly wanted it special and field-less).

## D3 — Dated lessons, manual order, no clock time

- **Decision**: `lessons.date` is a SQL `date` ('YYYY-MM-DD', matching the attendance convention). Order within a class's day is `lesson_classes.sort` (smallint). The frontend presents a week navigator grouping entries by day.
- **Rationale**: User chose "dated lessons on a calendar" + "day + manual order." `sort` on the binding (not the definition) lets the same lesson sit at a different position in different classes' days.
- **Alternatives**: weekday template (rejected — user chose dated); clock times (rejected — user chose manual order); `sort` on the definition (rejected — order is per-class).

## D4 — Sources: link / image / pdf

- **Decision**: `lesson_sources(kind ∈ {link,image,pdf}, url, description, sort)`. For `link`, `url` is the external URL. For `image`/`pdf`, the file is uploaded first via the `uploads` module and `url` stores the returned relative `/uploads/...` path (resolved client-side by `resolveAsset`).
- **Rationale**: Reuses the existing upload/serve mechanism and `resolveAsset` already used for institute logos. Only a new **PDF** endpoint is needed (images already supported).
- **PDF upload**: add `POST /api/uploads/pdf` to the existing controller — same `diskStorage`, filter `['.pdf']`, larger limit (~10 MB). Served by the existing static `/uploads` mapping.
- **Alternatives**: storing files as BLOBs in Postgres — rejected (volume-based file storage already standard here).

## D5 — Visibility toggle on the class

- **Decision**: add `classes.lessons_visible_to_students boolean NOT NULL DEFAULT false`. A `SetClassLessonsVisibilityUseCase` (manager) flips it; `GetClassProfile` exposes it so the toggle renders. The student view use-case returns entries only when the flag is on AND `date <= today`, projecting only name/description (+ recitation label), never sources or future entries.
- **Rationale**: Visibility is a property of the class, manager-controlled, and the filtering is enforced server-side (never trust the client). "Past" = `date <= today` (today inclusive) per the user.
- **Alternatives**: per-lesson visibility flags — rejected (user asked for a single per-class switch).

## D6 — Who can be the assigned teacher

- **Decision**: validate the assigned `teacher_id` is a member who may teach in the institute — a `teacher` of the institute OR a `manager` assigned to it — consistent with the spec-007 change that lets a manager be a class teacher. Reuse `MANAGER_ASSIGNMENTS.isAssigned` + user role/institute checks.
- **Rationale**: Keeps lesson assignment consistent with class-teacher eligibility already shipped. Does not require the teacher to already be a member of that specific class (a manager may assign any eligible teacher); this is the simplest rule and matches "set who is going to give each lesson."
- **Alternatives**: require the teacher to already be one of the class's teachers — deferred; can be tightened later without schema change.

## D7 — Access control reuse

- **Decision**: reuse `InstituteAccessPolicy` (`assertManagerOf`, `assertStaffOf`) and the `MANAGER_ASSIGNMENTS` port (both exported by `InstitutesModule`). Manager-only mutations use `assertManagerOf`; teacher/student reads are actor-scoped in the use-case. The `lessons` module imports `UsersModule`, `ClassesModule`, `InstitutesModule` (same as `recitations`).
- **Rationale**: Centralised, already-tested tenant checks; no new policy code.

## D8 — Teacher "my lessons / next lesson" query

- **Decision**: `GET /api/lessons/mine` returns the actor-teacher's `lesson_classes` joined to `lessons` (+ category, class name), sorted by `date` then `sort`, with the server marking the **next** entry (first with `date >= today`). The frontend highlights it.
- **Rationale**: One round-trip; "next" computed server-side for consistency across time zones using date-only comparison.

## D9 — Frontend reuse & tab reorganization

- **Decision**: The class **Lessons** tab currently hosts the attendance calendar (added in spec 007). Move that calendar into the **Attendance** tab; the Lessons tab becomes the program. Add a teacher **"دروسي / My Lessons"** sidebar page (visible to teachers; managers can also view via the class tab). Student portal gains a gated **Lessons** tab.
- **Rationale**: The user explicitly wants the Lessons tab to hold the program; the attendance calendar is conceptually attendance.
- **Reused primitives**: `Dialog`, `Select`, `Tabs`, `Card`, `Badge`, `Table`, `Button`, `Input`, `ConfirmDialog`, the upload helper + `resolveAsset`, `notify`, `EmptyState`, skeletons, and the React Query `qk` factory.

## D10 — Migration strategy

- **Decision**: one incremental migration `0003` (next after `0002_powerful_grandmaster`): create enums `lesson_kind`, `lesson_source_kind`; tables `lesson_categories`, `lessons`, `lesson_sources`, `lesson_classes`; and `ALTER TABLE classes ADD COLUMN lessons_visible_to_students boolean NOT NULL DEFAULT false`. All additive — safe on live data. `db:generate` → review → `migration:run`. Never `down -v`.
