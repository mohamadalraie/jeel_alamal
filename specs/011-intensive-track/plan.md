# Implementation Plan: Intensive Track — المسار المكثف (spec 011)

**Branch**: `011-intensive-track` | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-intensive-track/spec.md`

## Summary

The **Intensive Track (المسار المكثف)** allows an institute to run an optional secondary track of classes alongside its regular classes.
Each institute manager can enable or disable the intensive track. When enabled, managers and teachers can create **Intensive Classes** (`is_intensive = true`).
Students enrolled in a regular class in the institute can be enrolled into at most one intensive class (`class_intensive_students`).
Their attendance, recitations, dinars, and notes accumulate across both regular and intensive classes while keeping attendance statistics unified in their profile.

## Technical Context

**Language/Version**: TypeScript 5, Node 24

**Primary Dependencies**: NestJS (backend), Next.js App Router (frontend, Next 16), Drizzle ORM, TanStack Query v5, shadcn/ui, next-intl

**Storage**: PostgreSQL via Drizzle — new migration `0009_intensive_track.sql` (adding `intensive_track_enabled` to `institutes` and `is_intensive` to `classes`). Note: `class_intensive_students` table and `track_type` enum already exist in the database schema.

**Testing**: Backend unit/use-case tests using Jest and in-memory repository fakes.

**Target Platform**: Docker Compose (dev/prod), mobile-first web app.

**Performance Goals**: Instant toggle reaction (< 1 s); seamless filtering of intensive classes; combined attendance stats query executed in single database call or optimized join.

**Constraints**: Mobile-first; ar RTL default + en LTR; light + dark modes; semantic tokens only; no duplicated primitives; strict server-side tenant scoping (`institute_id`) and RBAC.

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| I. Clean Architecture — 4 layers | ✅ | Extends existing domain, application, infrastructure, and presentation layers in `institutes`, `classes`, and `attendance` modules. |
| II. Multi-tenancy — every mutation scoped to institute | ✅ | `intensiveTrackEnabled` is on `institutes`; `is_intensive` is on `classes` which carry `institute_id`; enrollment verifies student & class institute membership. |
| III. RBAC — deny by default | ✅ | Track toggle requires `assertManagerOf`; intensive class creation requires track enabled + manager/teacher permissions; enrollment requires manager or supervising teacher. |
| IV. JWT cookies, no client-sent institute_id | ✅ | `institute_id` derived server-side from actor context or entity relationships. |
| V. Component reuse — no duplicated primitives | ✅ | Reuses existing sidebar, class cards, dialogs, badges, and layout components with `isIntensive` variants/props. |
| VI. Semantic tokens only | ✅ | Intensive badge uses semantic accent/primary tokens (`bg-primary/10 text-primary border-primary/20`). No hardcoded colors. |
| VII. ar RTL + en LTR, mobile-first | ✅ | All labels under `intensiveTrack` namespace in `messages/ar.json` & `en.json`. Responsive flex/grid layouts. |
| VIII. Drizzle migrations — no push | ✅ | Migration generated via `db:generate`, reviewed SQL, committed, applied via `migration:run`. Safe fallback queries added to `runAutoMigrations`. |
| IX. Containerised | ✅ | Zero infrastructure configuration changes required. |
| X. Spec-driven | ✅ | Driven by `specs/011-intensive-track/spec.md`. |

**Result**: PASS

---

## Project Structure

### Documentation
```text
specs/011-intensive-track/
├── spec.md
├── plan.md              # This file
└── tasks.md             # Actionable task list
```

### Source Code Checklist

#### Backend
- `backend/src/modules/institutes/infrastructure/persistence/institute.schema.ts` — Add `intensiveTrackEnabled` boolean column.
- `backend/src/modules/institutes/domain/entities/institute.entity.ts` — Add `intensiveTrackEnabled` property.
- `backend/src/modules/institutes/application/use-cases/toggle-intensive-track.use-case.ts` — New use case for toggling track status.
- `backend/src/modules/institutes/presentation/institutes.controller.ts` — Add `PATCH /:id/intensive-track` endpoint.
- `backend/src/modules/classes/infrastructure/persistence/class.schema.ts` — Add `isIntensive` boolean column.
- `backend/src/modules/classes/domain/entities/class.entity.ts` — Add `isIntensive` property.
- `backend/src/modules/classes/application/use-cases/create-class.use-case.ts` — Validate `intensiveTrackEnabled` when creating intensive class.
- `backend/src/modules/classes/application/use-cases/list-classes.use-case.ts` — Filter by `track: 'regular' | 'intensive' | 'all'`.
- `backend/src/modules/classes/application/use-cases/add-intensive-student.use-case.ts` — Enforce BR-2 (regular enrollment check) and BR-3 (single intensive class check).
- `backend/src/modules/classes/presentation/classes.controller.ts` — Expose `track` filter and `isIntensive` in DTOs.
- `backend/src/main.ts` — Update `runAutoMigrations` safe queries for `intensive_track_enabled` and `is_intensive`.
- Migration file `backend/drizzle/0009_intensive_track.sql` (generated via `npm run db:generate`).

#### Frontend
- `frontend/src/lib/types.ts` — Update `Institute` & `Class` models.
- `frontend/src/lib/api.ts` — Add `toggleIntensiveTrack` endpoint call.
- `frontend/src/lib/queries.ts` — Add mutation & query hooks for intensive track.
- `frontend/src/components/layout/sidebar.tsx` — Add conditional "المسار المكثف" navigation item.
- `frontend/src/app/dashboard/intensive/page.tsx` — Intensive classes list page.
- `frontend/src/app/dashboard/intensive/[classId]/page.tsx` — Intensive class detail page wrapper.
- `frontend/src/features/classes/create-class-dialog.tsx` — Add "حلقة مكثفة" toggle checkbox.
- `frontend/src/messages/ar.json` & `en.json` — Add `intensiveTrack` translation strings.

---

## Key Design Decisions

1. **Class Reusability**: Rather than creating a separate table or module for intensive classes, an intensive class is simply a `classes` record with `is_intensive = true`. This preserves all existing teacher assignments, schedules, lesson assignments, attendance, and dinars functionality without code duplication.
2. **Student Enrollment Scoping**: Regular enrollment remains in `class_students`. Intensive enrollment remains in `class_intensive_students`. BR-2 ensures a student cannot be added to `class_intensive_students` without an active `class_students` entry in the same institute.
3. **Attendance aggregation**: Combined attendance statistics aggregate sessions across both `class_students` and `class_intensive_students` for a given student ID.

---

## Implementation Phases

- **Phase A — DB Migration**: Add `intensive_track_enabled` to `institutes` and `is_intensive` to `classes`. Run `db:generate`, review SQL, commit, run migration.
- **Phase B — Backend Institutes Module**: Implement `ToggleIntensiveTrackUseCase` and `PATCH /api/institutes/:id/intensive-track`. Update domain entity, repo, and response DTOs.
- **Phase C — Backend Classes Module**: Add `isIntensive` to Class domain & schema. Update `CreateClassUseCase` to guard against creation when track is disabled. Update `AddIntensiveStudentUseCase` to enforce BR-2 & BR-3. Update `ListClassesUseCase` with `track` parameter.
- **Phase D — Backend Attendance & Student Stats**: Ensure combined stats query handles regular + intensive class sessions seamlessly.
- **Phase E — Frontend Data Layer**: Update TypeScript types, API client methods, and React Query keys/hooks.
- **Phase F — Frontend UI Components & Routing**: Update Sidebar to show "المسار المكثف" link if enabled. Add `/dashboard/intensive` page. Update class creation dialog to allow selecting intensive track. Add intensive badge in student profile & class detail view.
- **Phase G — i18n & Verification**: Add dictionary keys in `ar.json` and `en.json`. Test full flow end-to-end. Run `npm run build` on both frontend and backend to verify zero compiler/type errors.
