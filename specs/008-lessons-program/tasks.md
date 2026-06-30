---
description: "Task list for Class Lessons Program (الدروس)"
---

# Tasks: Class Lessons Program (الدروس)

**Input**: Design documents from `/specs/008-lessons-program/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lessons-api.md, quickstart.md

**Tests**: Light unit specs for the highest-risk use-cases + one end-to-end verify script (per the plan's Testing section and the constitution's "business logic must be unit-testable"). Not full TDD.

**Organization**: Phase 1 Setup → Phase 2 Foundational (blocking) → Phase 3+ one phase per user story (priority order) → Final polish.

## Path Conventions

Web monorepo: `backend/src/...`, `frontend/src/...`. Backend module copies the `recitations` module shape.

---

## Phase 1: Setup

- [X] T001 Create the `lessons` module folder skeleton under `backend/src/modules/lessons/` with `domain/`, `application/dto/`, `application/`, `infrastructure/persistence/`, `presentation/` subfolders (empty placeholders to be filled).
- [X] T002 [P] Add domain enums: `backend/src/modules/lessons/domain/lesson-kind.ts` (`LessonKind = lesson|recitation`) and `backend/src/modules/lessons/domain/lesson-source-kind.ts` (`LessonSourceKind = link|image|pdf`), each exporting the enum + a `*_VALUES` array.

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ MUST complete before ANY user story phase.**

### Schema & migration

- [X] T003 Write `backend/src/modules/lessons/infrastructure/persistence/lesson.schema.ts`: pgEnums `lesson_kind`, `lesson_source_kind`; tables `lesson_categories`, `lessons`, `lesson_sources`, `lesson_classes` (unique `one_lesson_per_class` on (lesson_id,class_id)) exactly per [data-model.md](./data-model.md); export `InferSelectModel` row types.
- [X] T004 Add `lessons_visible_to_students boolean NOT NULL DEFAULT false` to the `classes` table in `backend/src/modules/classes/infrastructure/persistence/class.schema.ts`.
- [X] T005 Add the barrel line for `lesson.schema` to `backend/src/core/database/schema.ts`.
- [X] T006 Generate migration `0003` via `docker compose exec backend npm run db:generate`; review the SQL in `backend/drizzle/0003_*.sql` (additive only: enums + 4 tables + 1 class column); commit it; then apply with `docker compose exec backend npm run migration:run`. Verify the 4 tables + the class column exist. (No `drizzle-kit push`, no `down -v`.)

### Domain & repository port

- [X] T007 [P] Create domain entities in `backend/src/modules/lessons/domain/`: `lesson-category.entity.ts`, `lesson.entity.ts` (aggregate with sources + kind invariants per data-model), `lesson-class-binding.entity.ts`. Framework-free; validate invariants in `create`/`reconstitute`.
- [X] T008 Define `backend/src/modules/lessons/domain/lesson.repository.ts`: `LESSON_REPOSITORY` symbol + `LessonRepository` port (category CRUD; createLesson(definition+sources+bindings) tx; updateLesson; deleteLesson; removeBinding; reorder(classId,date,ids); read models: class program, teacher feed, student gated, category list) + read-model interfaces.

### Infrastructure & wiring

- [X] T009 Implement `backend/src/modules/lessons/infrastructure/persistence/drizzle-lesson.repository.ts` implementing every port method (transactions for create/update with bindings + sources; joins for read models). Map rows ↔ domain.
- [X] T010 Create `backend/src/modules/lessons/lessons.module.ts` (imports UsersModule, ClassesModule, InstitutesModule; binds `LESSON_REPOSITORY` → Drizzle impl; declares controller + all use-cases) and register `LessonsModule` in `backend/src/app.module.ts`.
- [X] T011 [P] Add `POST /api/uploads/pdf` to `backend/src/modules/uploads/uploads.controller.ts` (diskStorage, filter `['.pdf']`, ~10 MB limit) returning `{ url }`.

### Class visibility flag (extension)

- [X] T012 Add `lessonsVisibleToStudents` to the `Class` domain entity + mapper in `backend/src/modules/classes/domain/class.entity.ts` and `backend/src/modules/classes/infrastructure/persistence/drizzle-class.repository.ts`; expose it in `ClassProfileResult` (`class.lessonsVisibleToStudents`) in `class-profile.dto.ts` + `GetClassProfileUseCase`.
- [X] T013 Add `SetClassLessonsVisibilityUseCase` (manager-only, `assertManagerOf`) in `backend/src/modules/classes/application/use-cases/class-profile.use-cases.ts`, a `repo.setLessonsVisibility(classId, visible)` method, and `PUT /api/classes/:classId/lessons-visibility` in `classes.controller.ts`; register in `classes.module.ts`.

### Frontend data layer & shared scaffolding

- [X] T014 [P] Add lesson types to `frontend/src/lib/types.ts` (LessonKind, LessonSourceKind, LessonCategory, LessonSourceInput/View, ProgramEntry, TeacherLessonEntry, CreateLessonInput, etc. per contracts) and `lessonsVisibleToStudents` on `ClassProfile`.
- [X] T015 [P] Add API functions to `frontend/src/lib/api.ts` (categories CRUD, create/update/delete lesson, removeLessonClass, reorder, class program, student program, my lessons, set visibility, `uploadPdf`) per [contracts/lessons-api.md](./contracts/lessons-api.md).
- [X] T016 [P] Add React Query hooks + `qk` keys to `frontend/src/lib/queries.ts` (useLessonCategories, useClassLessons, useStudentClassLessons, useMyLessons) with `enabled` guards.
- [X] T017 [P] Add the `lessons` i18n namespace to `frontend/messages/ar.json` and `frontend/messages/en.json` (tab label, add lesson, recitation label "تسميع القرآن الكريم", category, color, source kinds, "my lessons", "next lesson", visibility toggle, empty states).
- [X] T018 [P] Create `frontend/src/features/lessons/lesson-colors.ts` (category color helpers + a readable-foreground helper for swatches; domain-data colors only).

### Tab reorganization (frees the Lessons tab)

- [X] T019 Move the attendance calendar out of the class **Lessons** tab into the **Attendance** tab in `frontend/src/app/[locale]/dashboard/classes/[classId]/page.tsx` (the Lessons tab will host the program; render `ClassAttendanceTab` + the existing `ClassLessonsCalendar` together under Attendance, or fold the calendar into `class-attendance-tab.tsx`).

**Checkpoint**: schema migrated, module wired, data layer + i18n ready — user-story phases can begin.

---

## Phase 3: User Story 1 — Manager builds a class's dated program (Priority: P1) 🎯 MVP

**Goal**: A manager can add/edit/delete dated lessons (with category + sources) in a class and see the weekly program with manual day-ordering.

**Independent test**: Open a class Lessons tab; add two lessons on the same date, reorder, edit one, delete the other; confirm correct dates/order and that a source opens.

### Backend

- [X] T020 [P] [US1] Category read + CRUD use-cases in `backend/src/modules/lessons/application/lesson-category.use-cases.ts` (Add/List/Update/Delete; manager for mutations, staff for list) + DTOs in `application/dto/lesson.dto.ts`.
- [X] T021 [US1] `CreateLessonUseCase` in `backend/src/modules/lessons/application/lesson.use-cases.ts` (manager): validate kind/name/sources, ≥1 assignment, institute scope + teacher eligibility (reuse `MANAGER_ASSIGNMENTS`), persist definition + sources + bindings in one transaction; `UpdateLessonUseCase` and `DeleteLessonUseCase`; `ReorderClassDayUseCase`.
- [X] T022 [US1] `GetClassProgramUseCase` in `backend/src/modules/lessons/application/class-program.use-case.ts` (staff of institute) returning `{ lessonsVisibleToStudents, entries[] }` sorted by date then sort.
- [X] T023 [US1] Wire endpoints in `backend/src/modules/lessons/presentation/lessons.controller.ts`: categories routes, `POST /institutes/:id/lessons`, `PATCH/DELETE /lessons/:id`, `DELETE /lesson-classes/:id`, `PUT /classes/:classId/lessons/order`, `GET /classes/:classId/lessons`; register use-cases in `lessons.module.ts`.
- [X] T024 [P] [US1] Unit spec `backend/src/modules/lessons/application/lesson.use-cases.spec.ts` for CreateLesson (in-memory fakes): name-required-for-lesson, tenant rejection, ≥1 assignment.

### Frontend

- [X] T025 [US1] `frontend/src/features/lessons/lesson-card.tsx` — one program entry (category color stripe/badge, name, teacher, sources count; recitation label variant).
- [X] T026 [US1] `frontend/src/features/lessons/lesson-sources-editor.tsx` — add/remove source rows (link | image | pdf via `uploadImage`/`uploadPdf`) each with a description; mobile-first.
- [X] T027 [US1] `frontend/src/features/lessons/add-lesson-dialog.tsx` — create/edit a lesson: kind toggle, name/description, category select, date, sources editor, single-class assignment (class + teacher) for now; uses `notify`, composes existing `Dialog/Select/Input/Button`.
- [X] T028 [US1] `frontend/src/features/lessons/lesson-program.tsx` — class Lessons tab: week navigator (reuse calendar utils), entries grouped by day, per-day add button, reorder (up/down), edit/delete via `ConfirmDialog`; empty states + skeletons.
- [X] T029 [US1] Render `<LessonProgram classId=.. />` in the class **Lessons** tab in `frontend/src/app/[locale]/dashboard/classes/[classId]/page.tsx` (manager: full controls; teacher: read-only).

**Checkpoint**: US1 delivers a working single-class program — the MVP.

---

## Phase 4: User Story 2 — One lesson for multiple classes, teacher per class (Priority: P1)

**Goal**: Schedule one lesson across several classes with a per-class teacher, no duplicated content; editing shared content updates all.

**Independent test**: Schedule one lesson for 2 classes (teacher A/B); confirm both show it with their teacher; edit shared name once → both update; remove from one class → remains in the other.

- [X] T030 [US2] Extend the create/update flow backend in `lesson.use-cases.ts` to accept multiple `assignments` and to treat `assignments` on update as the replacement binding set (add/remove classes, change per-class teacher) without duplicating shared content — confirm `CreateLessonUseCase` already persists N bindings and add `UpdateLessonUseCase` binding-diff logic.
- [X] T031 [US2] Upgrade `add-lesson-dialog.tsx` to a **multi-class** assignment step: select one or more classes (from the institute's classes) and choose a teacher per selected class (reuse `useClasses` + `listManagers`/`listTeachers` merged candidate list); validate every chosen class has a teacher.
- [X] T032 [P] [US2] Unit spec in `lesson.use-cases.spec.ts`: multi-class create persists one definition + N bindings; update edits shared content once; remove-binding affects one class only.

**Checkpoint**: multi-class scheduling works with no duplication.

---

## Phase 5: User Story 3 — Teacher sees their lessons & next lesson (Priority: P1)

**Goal**: A teacher logs in and sees their assigned lessons sorted by date with the next highlighted and openable.

**Independent test**: Assign 2 future lessons to a teacher across classes; as that teacher open "دروسي" → both listed, nearest highlighted, details open; empty state when none.

- [X] T033 [US3] `GetMyLessonsUseCase` in `backend/src/modules/lessons/application/teacher-lessons.use-case.ts` (actor teacher): bindings → lessons joined with category + class name, sorted date,sort, server flags `isNext` (first with date ≥ today); `GET /api/lessons/mine` in the controller.
- [X] T034 [US3] `frontend/src/features/lessons/teacher-lessons-view.tsx` — next-lesson highlight card + grouped upcoming/past list, opening full details (reuse `lesson-card` + a details view); empty state.
- [X] T035 [US3] New teacher page `frontend/src/app/[locale]/dashboard/my-lessons/page.tsx` rendering the view; add a **"دروسي"** item to `frontend/src/features/layout/sidebar-nav.tsx` (teachers; hidden for students; managers optional) and ensure teacher post-login still lands sensibly.

**Checkpoint**: teacher experience complete.

---

## Phase 6: User Story 4 — Manager manages dynamic categories (Priority: P2)

**Goal**: Manager adds/removes categories (name + color) used across the institute.

**Independent test**: Add a colored category, use it on a lesson, add+remove another; deleting a used category leaves lessons intact (uncategorized).

- [X] T036 [US4] `frontend/src/features/lessons/category-manager.tsx` — list institute categories, add (name + color picker), delete via `ConfirmDialog`; reuse `useLessonCategories` + mutations + `notify`.
- [X] T037 [US4] Surface the category manager from the Lessons tab (a "Manage categories" action/dialog for managers) in `lesson-program.tsx`; ensure `add-lesson-dialog` category select reflects changes (invalidate `qk`).

**Checkpoint**: categories are fully dynamic.

---

## Phase 7: User Story 5 — Quran-recitation entry (Priority: P2)

**Goal**: Add a field-less "تسميع القرآن الكريم" entry (class(es) + date + per-class teacher) shown distinctly.

**Independent test**: Add a recitation entry; it shows as "تسميع القرآن الكريم" with no name/category/sources; the assigned teacher sees it.

- [X] T038 [US5] Ensure backend `CreateLessonUseCase` + entity enforce the recitation invariants (kind=recitation → null name/description/category, no sources) and that read models emit the recitation label; add a unit-spec case.
- [X] T039 [US5] In `add-lesson-dialog.tsx` add a **kind switch** (Lesson | تسميع القرآن); when recitation, hide name/description/category/sources and only collect class(es)+teacher(s)+date. Render the recitation variant in `lesson-card.tsx` and teacher/student views.

**Checkpoint**: recitation entries supported end-to-end.

---

## Phase 8: User Story 6 — Student past-only gated view (Priority: P3)

**Goal**: Manager toggle lets a class's students see only past lessons' name+description (no future, no sources).

**Independent test**: Toggle off → student sees nothing; toggle on → only past name/description, no sources/future; recitation shows label.

- [X] T040 [US6] `GetStudentClassLessonsUseCase` in `backend/src/modules/lessons/application/student-lessons.use-case.ts`: allow only a student of the class AND when `lessons_visible_to_students` is on; return entries with `date <= today` projecting `{ lessonClassId, kind, name, description, date }` only; `GET /api/classes/:classId/lessons/student`.
- [X] T041 [P] [US6] Unit spec for the student use-case: hidden when flag off; excludes future; omits sources; recitation label.
- [X] T042 [US6] Manager **visibility toggle** UI in `lesson-program.tsx` (a Switch bound to `PUT /classes/:classId/lessons-visibility`, reading `lessonsVisibleToStudents` from the class profile) with `notify`.
- [X] T043 [US6] `frontend/src/features/lessons/student-lessons-view.tsx` (past-only list, name+description, recitation label, empty state) + a **Lessons** tab in the student portal `frontend/src/app/[locale]/dashboard/my-profile/page.tsx`, shown only when visible.

**Checkpoint**: full feature delivered.

---

## Phase 9: Polish & Cross-Cutting

- [X] T044 [P] Verify both locales (ar/RTL + en) and light + dark for every new screen (program, add/edit dialog, category manager, teacher page, student tab); fix any hard-coded strings or non-semantic chrome colors.
- [X] T045 [P] Mobile-width pass (≤360px) for the week view, add-lesson dialog (multi-class + sources), and teacher/student views.
- [X] T046 Create `scripts/verify-lessons.sh` per [quickstart.md](./quickstart.md): API login → create category + multi-class lesson + recitation → assert class program, `/lessons/mine`, student gated view (toggle on/off), tenant rejection; unique-suffixed data; no wipe.
- [X] T047 Restart backend + frontend containers, run `verify-lessons.sh`, and smoke-test the 6 quickstart scenarios; record results.
- [X] T048 [P] Update `CLAUDE.md`/agent memory notes with the new module summary (spec 008) and any gotchas (PDF upload endpoint, lessons tab now = program, attendance calendar moved).

---

## Dependencies & Execution Order

- **Setup (P1: T001–T002)** → **Foundational (T003–T019)** block everything.
- **User stories** then run in priority order; within the backend they share the module wired in Foundational:
  - **US1 (T020–T029)** = MVP. Depends only on Foundational.
  - **US2 (T030–T032)** extends US1's create/edit flow.
  - **US3 (T033–T035)** depends on lessons existing (US1) to have data, but the use-case/page are independent.
  - **US4 (T036–T037)** depends on the category backend (in US1/Foundational) + program tab.
  - **US5 (T038–T039)** extends the create flow/entity from US1.
  - **US6 (T040–T043)** depends on the visibility flag (Foundational T012–T013) + program tab.
- **Polish (T044–T048)** last.

### Parallel opportunities

- Foundational: T014–T018 (frontend data layer + i18n + colors) run in parallel with each other and with backend T007/T011 (different files). T003→T006 are sequential (schema→migrate).
- US1: T020 ∥ T024 (spec); frontend T025/T026 ∥ before composing T027/T028.
- Cross-story: once Foundational is done, a backend dev (US1/US2/US5 use-cases) and a frontend dev (US3 page, US4 category UI) can proceed in parallel.

## Implementation Strategy

- **MVP = Phase 1 + 2 + US1**: a manager can build a single-class dated program with categories and sources. Ship/validate before layering US2 (multi-class), US3 (teacher view), US4/US5, then US6 (students).
- Each user story is an independently testable increment per its checkpoint.

## Format validation

All tasks use `- [ ] T### [P?] [US#?] description + file path`; Setup/Foundational/Polish carry no story label; user-story tasks carry `[US#]`.
