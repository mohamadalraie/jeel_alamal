# Implementation Plan: Class Lessons Program (الدروس)

**Branch**: `008-lessons-program` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-lessons-program/spec.md`

## Summary

Add a per-class **lessons program**: dated lesson entries (manual order per day, no clock time), dynamic per-institute **categories** (name + color), a special **"تسميع القرآن الكريم"** entry kind, and **lesson sources** (link / image / pdf, each with a description). A manager can **schedule one lesson for multiple classes at once with a teacher per class**, storing the shared content **once** (a `lessons` definition) and binding it to each class via `lesson_classes` (its own id + teacher). Teachers get a read-only **"my lessons / next lesson"** view; students get a **past-only, name+description-only** view gated by a per-class **manager toggle**.

Technical approach: a new backend `lessons` bounded context following the 4-layer Clean Architecture of the `users`/`recitations` reference modules; one incremental Drizzle migration adding the lesson tables + enums and a `lessons_visible_to_students` column on `classes`; a PDF upload endpoint added to the existing `uploads` module; frontend `features/lessons/` composing existing `components/ui` primitives, a teacher "دروسي" page, the class **Lessons tab** (program), and a student past-view in the portal. The class **attendance calendar** moves out of the Lessons tab into the Attendance tab to free the Lessons tab for the program.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 24

**Primary Dependencies**: Backend — NestJS, Drizzle ORM, `pg`, class-validator/transformer, multer (uploads). Frontend — Next.js 16 (App Router, `proxy.ts` locale routing), Tailwind v4, shadcn/ui, next-intl, TanStack React Query, sonner. No NEW runtime dependencies are required.

**Storage**: PostgreSQL via Drizzle (incremental migration `0003`). Uploaded image/PDF sources stored on the `uploads` volume and served at `/uploads/*` (existing mechanism).

**Testing**: Jest unit specs for new use-cases (in-memory fakes, no DB) per the reference modules; an end-to-end shell verification script (`scripts/verify-lessons.sh`) against the live DB with unique-suffixed test data (no `down -v`).

**Target Platform**: Dockerized web (frontend 3000, backend 3001 `/api`, db 5432), mobile-first.

**Project Type**: Web application — monorepo `frontend/` (Next.js) + `backend/` (NestJS).

**Performance Goals**: Standard interactive web; a class week view and a teacher's lesson list each load in a single round-trip and render instantly at mobile width.

**Constraints**: Multi-tenant (`institute_id` scoping, deny-by-default), RBAC server-side, Arabic RTL default + English, light + dark mandatory, semantic color tokens only, incremental Drizzle migrations only (never `drizzle-kit push`, never `down -v`).

**Scale/Scope**: Tens of classes and a few hundred lessons per institute; one new backend module (~4 layers), one migration, and ~one feature folder + 2 pages + tab content on the frontend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Clean Architecture (4 layers)** — PASS. New `modules/lessons` with `domain` (entities: LessonCategory, Lesson, LessonSource, LessonClassBinding; `LESSON_REPOSITORY` port), `application` (use-cases + DTOs), `infrastructure` (`lesson.schema.ts` + `drizzle-lesson.repository.ts`), `presentation` (`lessons.controller.ts`). Ports bound only in `lessons.module.ts`. Domain imports no framework. Copies the `recitations` module shape.
- **II. Multi-Tenancy** — PASS. `lesson_categories` and `lessons` carry `institute_id`; every use-case takes the actor and scopes by institute via the reused `InstituteAccessPolicy`; class/teacher selections are validated to belong to the same institute. No client-supplied institute trust.
- **III. RBAC (deny by default)** — PASS. Managers: full CRUD on categories/lessons + visibility toggle (`assertManagerOf`). Teachers: read-only of their own assignments. Students: gated past-only read. Checks live in use-cases; controller only extracts the actor.
- **IV. Auth & Security** — PASS. Reuses the global JWT AuthGuard + cookies; new endpoints are non-public; uploads validate type/size; DTO whitelisting via global ValidationPipe.
- **V. Component Reuse** — PASS. Frontend composes existing `components/ui` (Dialog, Select, Card, Tabs, Badge, Table, Button, Input). Reuses the upload helper, `ConfirmDialog`, list patterns, `MonthCalendar` style, `notify`, React Query `qk`. No new primitives forked.
- **VI. Brand & Theming** — PASS. Category colors are user-data (stored hex, rendered as swatches/inline style — domain data, like attendance status colors), but all chrome uses semantic tokens. Light + dark both delivered.
- **VII. Mobile-first, Bilingual, RTL** — PASS. All strings in `messages/{ar,en}.json`; logical properties; designed at mobile width first; both locales before done.
- **VIII. Drizzle Migrations** — PASS. One incremental migration `0003` (additive: new tables/enums + one nullable-with-default class column). `db:generate` → review SQL → commit → `migration:run`. No `push`.
- **IX. Containerised** — PASS. Runs in existing containers; restart after changes; no new deps to install in containers.
- **X. Spec-Driven** — PASS. This plan follows the spec; tasks come next.

**Result: PASS — no violations. Complexity Tracking not required.**

## Project Structure

### Documentation (this feature)

```text
specs/008-lessons-program/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── lessons-api.md    # Phase 1 output (endpoint contracts)
├── checklists/
│   └── requirements.md   # spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/src/modules/lessons/
├── domain/
│   ├── lesson-kind.ts                     # enum: lesson | recitation
│   ├── lesson-source-kind.ts              # enum: link | image | pdf
│   ├── lesson-category.entity.ts
│   ├── lesson.entity.ts                   # shared definition (+ sources, kind, date)
│   ├── lesson-class-binding.entity.ts     # per-class binding (classId, teacherId, sort)
│   └── lesson.repository.ts               # LESSON_REPOSITORY port + read models
├── application/
│   ├── dto/lesson.dto.ts                  # Create/Update DTOs + read-model interfaces
│   ├── lesson-category.use-cases.ts       # add / list / update / delete category
│   ├── lesson.use-cases.ts                # create / update / delete lesson; reorder
│   ├── class-program.use-case.ts          # class program (staff full view)
│   ├── teacher-lessons.use-case.ts        # my lessons + next (teacher)
│   └── student-lessons.use-case.ts        # past-only gated view (student)
├── infrastructure/persistence/
│   ├── lesson.schema.ts                   # tables + enums
│   └── drizzle-lesson.repository.ts
├── presentation/
│   └── lessons.controller.ts
└── lessons.module.ts

backend/src/modules/classes/                # EXTENSION (not a new module)
├── domain/class.entity.ts                 # + lessonsVisibleToStudents
├── application/use-cases/class-profile.use-cases.ts  # + SetClassLessonsVisibilityUseCase; expose flag
└── infrastructure/persistence/class.schema.ts        # + lessons_visible_to_students column

backend/src/modules/uploads/uploads.controller.ts     # + POST /uploads/pdf
backend/src/core/database/schema.ts                    # + barrel line for lesson.schema
backend/src/app.module.ts                              # + LessonsModule
backend/drizzle/0003_*.sql                             # incremental migration

frontend/src/features/lessons/
├── lesson-colors.ts                       # category color helpers (domain data)
├── lesson-program.tsx                     # class Lessons tab: week view + day groups
├── lesson-card.tsx                        # one program entry (lesson/recitation)
├── add-lesson-dialog.tsx                  # create/edit: kind, fields, sources, multi-class+teacher
├── lesson-sources-editor.tsx             # link/image/pdf rows with upload
├── category-manager.tsx                   # add/remove categories (name+color)
├── teacher-lessons-view.tsx               # "دروسي": my lessons + next highlighted
└── student-lessons-view.tsx               # past-only program (portal)

frontend/src/app/[locale]/dashboard/
├── classes/[classId]/page.tsx             # Lessons tab → program; Attendance tab gets the calendar
├── my-lessons/page.tsx                    # NEW teacher page
└── my-profile/page.tsx                    # student portal: + lessons tab (gated)

frontend/src/features/layout/sidebar-nav.tsx           # + "دروسي" (teacher) item
frontend/src/lib/{types,api,queries}.ts                # lesson types, api fns, hooks
frontend/messages/{ar,en}.json                         # lessons namespace
```

**Structure Decision**: Web monorepo. A new self-contained backend bounded context `modules/lessons` (4 layers, copying `recitations`), plus minimal **extensions** to existing modules (`classes` gains the visibility flag + toggle use-case; `uploads` gains a PDF endpoint; `app.module` + schema barrel register the module). Frontend adds a `features/lessons/` folder composing existing primitives, one new teacher page, the class Lessons-tab content, and a gated student view — reusing the established `lib/{types,api,queries}` and i18n conventions.

## Complexity Tracking

> No constitution violations — section intentionally empty.
