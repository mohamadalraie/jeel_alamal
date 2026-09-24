---
description: "Task list for Intensive Track (المسار المكثف) implementation"
---

# Tasks: Intensive Track — المسار المكثف (spec 011)

**Input**: Design documents from `/specs/011-intensive-track/`

**Prerequisites**: plan.md, spec.md

**Tests**: Backend use-case unit tests for modified/new use-cases (e.g. `ToggleIntensiveTrackUseCase`, `CreateClassUseCase` guard, `AddIntensiveStudentUseCase` BR-2 check).

---

## Phase 1: Database Migration & Schema Setup

- [ ] T001 Edit `backend/src/modules/institutes/infrastructure/persistence/institute.schema.ts` to add `intensiveTrackEnabled: boolean('intensive_track_enabled').default(false).notNull()`.
- [ ] T002 Edit `backend/src/modules/classes/infrastructure/persistence/class.schema.ts` to add `isIntensive: boolean('is_intensive').default(false).notNull()`.
- [ ] T003 Generate Drizzle migration using `npm run db:generate` in `backend`, review generated SQL file `0009_intensive_track.sql`, commit to git, and run `npm run migration:run`.
- [ ] T004 Add safe query columns to `runAutoMigrations` function in `backend/src/main.ts` (`ALTER TABLE institutes ADD COLUMN IF NOT EXISTS intensive_track_enabled boolean DEFAULT false`, `ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_intensive boolean DEFAULT false`).

---

## Phase 2: Backend — Institutes Module Extension (US-1)

- [ ] T005 Edit `backend/src/modules/institutes/domain/entities/institute.entity.ts` to add `intensiveTrackEnabled` property, getter, and `toggleIntensiveTrack(enabled: boolean)` domain method.
- [ ] T006 Edit `backend/src/modules/institutes/infrastructure/persistence/drizzle-institute.repository.ts` to persist and hydrate `intensiveTrackEnabled`.
- [ ] T007 Create `backend/src/modules/institutes/application/use-cases/toggle-intensive-track.use-case.ts`:
  - Enforce `InstituteAccessPolicy.assertManagerOf(actor, instituteId)`.
  - Toggle track and save.
- [ ] T008 Update institute DTOs and `GetInstituteUseCase` in `backend/src/modules/institutes/application/` to expose `intensiveTrackEnabled`.
- [ ] T009 Add `PATCH /api/institutes/:id/intensive-track` endpoint to `backend/src/modules/institutes/presentation/institutes.controller.ts`.

---

## Phase 3: Backend — Classes Module Extension (US-2 & US-3)

- [ ] T010 Edit `backend/src/modules/classes/domain/entities/class.entity.ts` to add `isIntensive` property and getter.
- [ ] T011 Edit `backend/src/modules/classes/infrastructure/persistence/drizzle-class.repository.ts` to handle `isIntensive` column and support `track` filtering (`regular` | `intensive`).
- [ ] T012 Update `backend/src/modules/classes/application/use-cases/create-class.use-case.ts`:
  - If `isIntensive = true`, fetch Institute and verify `institute.intensiveTrackEnabled === true`. If false, throw `ForbiddenException` / `UnprocessableEntityException`.
- [ ] T013 Update `backend/src/modules/classes/application/use-cases/list-classes.use-case.ts`:
  - Accept optional `track: 'regular' | 'intensive'` parameter.
- [ ] T014 Update `backend/src/modules/classes/application/use-cases/add-intensive-student.use-case.ts`:
  - Implement BR-2 check: Verify student is currently enrolled in a regular class in the same institute (`class_students` query). If not, throw `422 Unprocessable Entity` ("Student must be enrolled in a regular class first").
  - Implement BR-3 check: Verify student is not already enrolled in another intensive class (`class_intensive_students` check). If already enrolled, throw `409 Conflict`.
- [ ] T015 Update `backend/src/modules/classes/presentation/classes.controller.ts` to expose `track` query param in GET `/api/institutes/:id/classes` and support `isIntensive` in `CreateClassDto`.

---

## Phase 4: Frontend Data Layer & Types

- [ ] T016 Update `frontend/src/lib/types.ts`:
  - Add `intensiveTrackEnabled: boolean` to `Institute`.
  - Add `isIntensive: boolean` to `Class`.
- [ ] T017 Update `frontend/src/lib/api.ts`:
  - Add `toggleIntensiveTrack(instituteId: string, enabled: boolean): Promise<Institute>`.
  - Update `listClasses(instituteId: string, track?: 'regular' | 'intensive')`.
- [ ] T018 Update `frontend/src/lib/queries.ts`:
  - Add `useToggleIntensiveTrack` mutation hook.
  - Update class queries hooks to support track filtering.

---

## Phase 5: Frontend UI & Routing (US-1, US-2, US-3, US-5)

- [ ] T019 Update `frontend/src/components/layout/sidebar.tsx`:
  - Show "المسار المكثف" link under Institute nav if `currentInstitute.intensiveTrackEnabled === true`.
- [ ] T020 Create `/dashboard/intensive` list page (`frontend/src/app/dashboard/intensive/page.tsx`):
  - Renders intensive classes list using existing class grid/cards with "مكثف" badge.
- [ ] T021 Create `/dashboard/intensive/[classId]` detail page (`frontend/src/app/dashboard/intensive/[classId]/page.tsx`):
  - Wraps existing class details dialog/view with intensive track header and badge.
- [ ] T022 Update `frontend/src/features/classes/create-class-dialog.tsx`:
  - Add "حلقة مكثفة؟" switch/checkbox (only visible if `currentInstitute.intensiveTrackEnabled === true`).
- [ ] T023 Update institute settings component (`frontend/src/features/institutes/`):
  - Add toggle for "تفعيل المسار المكثف".
- [ ] T024 Update student profile component:
  - If student is enrolled in intensive track, display an "المسار المكثف" badge and intensive class details card.

---

## Phase 6: i18n & Final Polish

- [ ] T025 Add `intensiveTrack` dictionary entries in `frontend/src/messages/ar.json` and `frontend/src/messages/en.json`.
- [ ] T026 Execute backend tests `npm run test` and compile checks `npm run build` on backend.
- [ ] T027 Execute frontend build `npm run build` in `frontend` to verify zero type errors.
