# Implementation Plan: Lesson Lifecycle — الدرس من البداية إلى النهاية

**Branch**: `009-lesson-lifecycle` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)

## Summary

Extend the existing lessons module (spec 008) with:

1. **Expected duration** field on the shared lesson definition.
2. **Status machine** on each `lesson_classes` binding: `pending → started → finished / over_time / under_time`; `not_given` evaluated lazily on read.
3. **Teacher flow**: Start button → live timer page → End button → final status computed against `LessonSettings`.
4. **LessonSettings** per-institute: duration threshold (default 10 min), enable/disable over/under-time evaluation.

All changes are additive (one new migration, no destructive schema changes).

---

## Technical Context

**Language/Version**: TypeScript 5, Node 24

**Primary Dependencies**: NestJS (backend), Next.js App Router (frontend), Drizzle ORM, TanStack Query v5, shadcn/ui, next-intl

**Storage**: PostgreSQL via Drizzle — one new migration `0004`

**Testing**: Jest (backend use-case unit tests with in-memory fakes)

**Target Platform**: Docker Compose (dev), mobile-first web

**Performance Goals**: Timer page must display correct elapsed time within 1 second of load; start/end round-trips < 300 ms p95

**Constraints**: Mobile-first; ar RTL default; both light + dark theme; no raw colors

**Scale/Scope**: Per-institute, per-class; typically < 50 lessons per class per month

---

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| I. Clean Architecture — 4 layers | ✅ | New use-cases in `application/`, entities in `domain/`, Drizzle in `infrastructure/`, thin controller in `presentation/` |
| II. Multi-tenancy — every mutation scoped to institute | ✅ | Start/End use-cases load the binding, resolve its `lesson.instituteId`, assert the caller belongs to that institute |
| III. RBAC — deny by default | ✅ | Start/End: teacher-only AND must be the assigned teacher for that binding; Settings: manager-only |
| IV. JWT cookies, no client-sent institute_id | ✅ | `lessonClassId` in URL, institute derived server-side |
| V. Component reuse — no duplicated primitives | ✅ | New `LessonStatusBadge` is a single shared component; `Button`, `Dialog` from `ui/` |
| VI. Semantic tokens only | ✅ | Status colors via `status-*` CSS variables or existing `destructive`/`success` tokens |
| VII. ar RTL + en LTR, mobile-first | ✅ | All new strings in `messages/ar.json` + `messages/en.json`; timer page is single-column mobile layout |
| VIII. Drizzle migrations — no push | ✅ | `db:generate` → review SQL → commit → `migration:run` |

---

## Project Structure

### Documentation (this feature)

```
specs/009-lesson-lifecycle/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── lessons-lifecycle-api.md
└── checklists/
    └── requirements.md
```

### Source code changes

```
backend/src/modules/lessons/
├── domain/
│   ├── lesson-binding-status.ts          NEW — enum + type
│   ├── lesson.entity.ts                  EDIT — add expectedDurationMinutes
│   ├── lesson-class-binding.entity.ts    EDIT — add status, actualStartTime, actualEndTime, start(), end()
│   ├── lesson-settings.entity.ts         NEW — LessonSettings aggregate
│   ├── lesson-settings.repository.ts     NEW — LESSON_SETTINGS_REPOSITORY port
│   └── lesson.repository.ts              EDIT — add findBindingById(), hasAnyStartedBinding()
├── application/
│   ├── dto/
│   │   └── lesson.dto.ts                 EDIT — add expectedDurationMinutes to Create/UpdateLessonDto; add status fields to views
│   ├── lesson.use-cases.ts               EDIT — CreateLesson + UpdateLesson accept expectedDurationMinutes; lock on started
│   ├── lesson-lifecycle.use-cases.ts     NEW — StartLessonUseCase, EndLessonUseCase
│   ├── lesson-settings.use-cases.ts      NEW — GetLessonSettingsUseCase, UpdateLessonSettingsUseCase
│   ├── class-program.use-case.ts         EDIT — toEntryView() maps new fields; lazy not_given
│   └── teacher-lessons.use-case.ts       EDIT — include status + new fields
├── infrastructure/
│   ├── persistence/
│   │   ├── lesson.schema.ts              EDIT — new columns + new lessonSettings table + new enum
│   │   └── drizzle-lesson.repository.ts  EDIT — findBindingById, hasAnyStartedBinding, update binding
│   └── persistence/
│       └── drizzle-lesson-settings.repository.ts  NEW
├── presentation/
│   └── lessons.controller.ts             EDIT — add 4 new routes
└── lessons.module.ts                     EDIT — register new use-cases + repo binding

backend/drizzle/
└── 0004_lesson_lifecycle.sql             NEW (generated)

frontend/src/
├── lib/
│   ├── types.ts                          EDIT — LessonBindingStatus, LessonSettings, extend ProgramEntry
│   ├── api.ts                            EDIT — startLesson, endLesson, getLessonSettings, updateLessonSettings
│   └── queries.ts                        EDIT — useMyLessons hook (already exists), useInstituteLessons; add useLessonSettings
├── features/lessons/
│   ├── lesson-status-badge.tsx           NEW — reusable colored badge for all 6 statuses
│   ├── lesson-timer-page.tsx             NEW — live timer, End button, lesson details
│   ├── lesson-card.tsx                   EDIT — show status badge + duration info
│   ├── lesson-program.tsx                EDIT — Start button per entry (teacher view)
│   ├── teacher-lessons-view.tsx          EDIT — Start button per entry → navigate to timer
│   ├── institute-lessons-hub.tsx         EDIT — status badge in HubLessonRow
│   └── add-lesson-dialog.tsx             EDIT — expectedDurationMinutes field
├── features/lessons/settings/
│   └── lesson-settings-form.tsx          NEW — threshold + toggle + categories (moved from hub toolbar)
└── app/[locale]/dashboard/
    ├── lesson-timer/[lessonClassId]/
    │   └── page.tsx                      NEW — teacher-only timer route
    └── lessons/
        └── settings/
            └── page.tsx                  NEW — manager-only settings route

messages/
├── ar.json                               EDIT — new status labels + timer + settings keys
└── en.json                               EDIT — same
```

---

## Implementation Phases

### Phase A — Backend domain + schema (foundation)

**A1.** Add `lesson-binding-status.ts` domain enum:
```
pending | started | finished | not_given | over_time | under_time
```

**A2.** Extend `lesson-class-binding.entity.ts`:
- Add props: `status`, `actualStartTime`, `actualEndTime`
- `start(now: Date)`: assert `status === 'pending'`; set `status = 'started'`, `actualStartTime = now`
- `end(now: Date, settings)`: assert `status === 'started'`; set `actualEndTime`, compute final status

**A3.** Extend `lesson.entity.ts`:
- Add `expectedDurationMinutes: number | null`
- `setExpectedDuration(m: number | null)`: validate `m >= 1 || m === null`

**A4.** New `lesson-settings.entity.ts` + `lesson-settings.repository.ts`

**A5.** Extend `lesson.repository.ts` port:
- `findBindingById(lessonClassId): Promise<{ binding, lesson, instituteId } | null>`
- `hasAnyStartedBinding(lessonId): Promise<boolean>` — for the duration-lock check
- `updateBinding(binding: LessonClassBinding): Promise<void>`

**A6.** Update `lesson.schema.ts` — add columns + enum + new table

**A7.** `npm run db:generate` → review SQL → commit as `0004_lesson_lifecycle.sql`

**A8.** `npm run migration:run`

---

### Phase B — Backend application layer

**B1.** `lesson-lifecycle.use-cases.ts` (new file):

`StartLessonUseCase.execute(actor, lessonClassId)`:
1. Load binding+lesson via `findBindingById`
2. Assert `actor.userId === binding.teacherId` (403)
3. Assert `lesson.date <= today` (422)
4. `binding.start(new Date())`
5. `updateBinding(binding)`

`EndLessonUseCase.execute(actor, lessonClassId) → { status, actualDurationMinutes }`:
1. Load binding+lesson
2. Assert `actor.userId === binding.teacherId` (403)
3. Load `LessonSettings` (upsert with defaults if missing)
4. `binding.end(new Date(), settings)`
5. `updateBinding(binding)`
6. Return final status + actual minutes

**B2.** `lesson-settings.use-cases.ts` (new file):

`GetLessonSettingsUseCase`: load or return defaults
`UpdateLessonSettingsUseCase`: assert manager; upsert

**B3.** Update `lesson.use-cases.ts`:
- `CreateLessonUseCase`: accept `expectedDurationMinutes` in DTO; pass to `Lesson.create()`
- `UpdateLessonUseCase`: if `expectedDurationMinutes` in payload, call `hasAnyStartedBinding(lessonId)` first; throw if true

**B4.** Update `class-program.use-case.ts`:
- `toEntryView()`: add `status` (lazy `not_given` if `status === 'pending' && date < today`), `expectedDurationMinutes`, `actualStartTime`, `actualEndTime`

**B5.** Update `teacher-lessons.use-case.ts`: same fields in `TeacherProgramEntry`

**B6.** Update `lessons.controller.ts` — add:
- `POST lesson-classes/:id/start`
- `POST lesson-classes/:id/end`
- `GET institutes/:id/lesson-settings`
- `PUT institutes/:id/lesson-settings`

**B7.** Update `lessons.module.ts` — register new use-cases and `LESSON_SETTINGS_REPOSITORY`

---

### Phase C — Frontend data layer

**C1.** `lib/types.ts`: add `LessonBindingStatus`, `LessonSettings`; extend `ProgramEntry`, `InstituteLesson`

**C2.** `lib/api.ts`: add `startLesson(lcId)`, `endLesson(lcId)`, `getLessonSettings(instituteId)`, `updateLessonSettings(instituteId, dto)`

**C3.** `lib/queries.ts`: add `qk.lessonSettings(id)`, `useLessonSettings(instituteId?)`

---

### Phase D — Frontend features

**D1.** `lesson-status-badge.tsx` — shared badge:
- Maps each of the 6 statuses to an Arabic label + English label + color token
- `pending` → muted; `started` → blue/info; `finished` → success; `not_given` → destructive; `over_time` → warning orange; `under_time` → warning yellow

**D2.** `lesson-card.tsx` — add status badge (top-right), expected duration chip, actual duration (when finished)

**D3.** `lesson-program.tsx` — for teacher role: show "Start" button on entries where `status === 'pending' && date <= today && actor.userId === entry.teacher.id`; clicking navigates to `/dashboard/lesson-timer/[lessonClassId]`

**D4.** `teacher-lessons-view.tsx` — same Start button logic

**D5.** `institute-lessons-hub.tsx` — `HubLessonRow` shows `LessonStatusBadge` next to lesson name

**D6.** `add-lesson-dialog.tsx` — add `expectedDurationMinutes` number input (optional, min 1, label "المدة المتوقعة (دقائق)" / "Expected duration (min)")

**D7.** `lesson-timer-page.tsx` (new component):
- On mount: reads `actualStartTime` from current binding data (via `useClassLessons` or a dedicated endpoint)
- `useEffect` interval: every second, compute `elapsed = Date.now() - actualStartTime`; display as `MM:SS`
- Shows: lesson name/kind, date, expected duration, ordinal position (lesson N of M today)
- Shows a progress ring/bar comparing elapsed vs expected (when expected is set)
- "End lesson" button → `ConfirmDialog` → calls `endLesson(lessonClassId)` → shows result status → navigates back to my-lessons

**D8.** `lesson-settings-form.tsx` (new):
- Threshold slider/number input
- Toggle for duration status feature
- Category management (moved from hub toolbar)
- "Show lessons to students" institute-level default

**D9.** New pages:
- `app/[locale]/dashboard/lesson-timer/[lessonClassId]/page.tsx` — teacher-only, renders `LessonTimerPage`
- `app/[locale]/dashboard/lessons/settings/page.tsx` — manager-only, renders `LessonSettingsForm`

---

### Phase E — i18n + polish

**E1.** `messages/ar.json` + `messages/en.json` — add:
- Status labels: `pending`, `started`, `finished`, `not_given`, `over_time` (تجاوز الوقت), `under_time` (أقل من الوقت)
- Timer page strings: `elapsed`, `expected`, `endLesson`, `endLessonConfirm`, `lessonNofM`
- Settings strings: `durationThreshold`, `durationStatusEnabled`, `durationStatusHint`
- Duration display: `durationMinutes` (`{n} دقيقة` / `{n} min`)

---

## Complexity Tracking

No constitution violations. No new bounded contexts; everything extends the existing `lessons` module.

---

## Open Questions (none — all resolved in research.md)

All design decisions are documented in `research.md`.
