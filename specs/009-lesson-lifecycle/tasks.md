# Tasks: Lesson Lifecycle — الدرس من البداية إلى النهاية

**Input**: Design documents from `specs/009-lesson-lifecycle/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/lessons-lifecycle-api.md](contracts/lessons-lifecycle-api.md)

**Organization**: Tasks grouped by user story. Foundational phase (Phase 2) must complete before any story phase begins.

> **Revision note**: This task list was revised after auditing the existing lessons module against the plan. Key adjustments (enhancements A/B/C):
> - Reuse the existing `findBindingById` + `findLessonById` pattern (do NOT change `findBindingById`'s signature).
> - Add the new read fields in the shared `queryEntries` join + `ProgramEntryRead`, then map through `toEntryView` / `groupByLesson`.
> - Centralize `not_given` derivation in one domain helper used by all read paths.
> - Duration evaluation stays a pure `LessonSettings.evaluate()`, orchestrated by `EndLessonUseCase`.
> - Conditional DB writes for start/end to prevent double-transition.
> - Dedicated `GET /lesson-classes/:id/timer` for the timer page.
> - Unit tests for new use-cases (constitution Quality Gate #2).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no dependency)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (Verification) ✅ done during audit

- [X] T001 Audit `backend/src/modules/lessons/` (entity, schema, repository, module, controller, use-cases) — confirmed current shape
- [X] T002 Audit `frontend/src/features/lessons/` components — confirmed current shape

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration and domain types every story depends on. **No story work begins until T010 (migration) is done.**

- [X] T003 Create `backend/src/modules/lessons/domain/lesson-binding-status.ts` — export `LessonBindingStatus` type (`'pending' | 'started' | 'finished' | 'not_given' | 'over_time' | 'under_time'`) and a pure helper `deriveReadStatus(rawStatus, date, today): LessonBindingStatus` that returns `'not_given'` when `rawStatus === 'pending' && date < today`, else `rawStatus`
- [X] T004 Extend `backend/src/modules/lessons/domain/lesson.entity.ts` — add `expectedDurationMinutes: number | null` to props + getter; add to `create()` and `edit()`; add validation `minutes === null || minutes >= 1` (throw `BusinessRuleError` otherwise)
- [X] T005 [P] Extend `backend/src/modules/lessons/domain/lesson-class-binding.entity.ts` — add `status: LessonBindingStatus`, `actualStartTime: Date | null`, `actualEndTime: Date | null` to props (default in `create()`: `status='pending'`, timestamps null); add getters; add `start(now)` (assert `pending`, set `started` + `actualStartTime`), `end(now)` (assert `started`, set `actualEndTime`, return `actualMinutes = ceil((end-start)/60000)`), `applyStatus(final)` (set terminal status)
- [X] T006 [P] Create `backend/src/modules/lessons/domain/lesson-settings.entity.ts` — `LessonSettings` with `instituteId`, `durationThresholdMinutes`, `durationStatusEnabled`; `static defaults(instituteId)`; `update({thresholdMinutes, enabled})`; pure `evaluate(actualMinutes, expectedMinutes): 'finished'|'over_time'|'under_time'` per FR-016/017 (disabled/threshold≤0/null expected → `finished`; `actual > expected + threshold` → `over_time`; `actual < expected - threshold` → `under_time`; else `finished`)
- [X] T007 [P] Create `backend/src/modules/lessons/domain/lesson-settings.repository.ts` — `LESSON_SETTINGS_REPOSITORY` token; interface `findByInstitute(instituteId): Promise<LessonSettings | null>`, `save(s): Promise<void>`
- [X] T008 Extend `backend/src/modules/lessons/domain/lesson.repository.ts` — (a) add `expectedDurationMinutes`, `status`, `actualStartTime`, `actualEndTime` to `ProgramEntryRead`; (b) add methods `hasAnyStartedBinding(lessonId): Promise<boolean>` and `updateBindingLifecycle(binding): Promise<boolean>` (conditional write, returns whether a row changed). Do NOT change existing `findBindingById` signature.
- [X] T009 Update `backend/src/modules/lessons/infrastructure/persistence/lesson.schema.ts` — add `lessonBindingStatusEnum` pgEnum (6 values); add `expectedDurationMinutes` (integer, nullable) to `lessons`; add `status` (enum, NOT NULL DEFAULT 'pending'), `actualStartTime`, `actualEndTime` (timestamptz nullable) to `lessonClasses`; add new `lessonSettings` table (id, institute_id UNIQUE FK cascade, duration_threshold_minutes smallint DEFAULT 10, duration_status_enabled boolean DEFAULT true, updated_at)
- [X] T010 Run `npm run db:generate` in backend, review generated `backend/drizzle/0004_*.sql` (new enum, 3 columns on lesson_classes, 1 column on lessons, new table), commit, then `npm run migration:run`
- [X] T011 [P] Update `frontend/src/lib/types.ts` — add `LessonBindingStatus`, `LessonSettings`; extend `ProgramEntry` with `status`, `expectedDurationMinutes`, `actualStartTime`, `actualEndTime`; extend `InstituteLesson.classes[n]` with `status`, `actualStartTime`, `actualEndTime`

**Checkpoint**: Migration applied; domain types, ports, read model extended.

---

## Phase 3: User Story 1 — Manager schedules a lesson with expected duration (P1) 🎯 MVP start

**Independent Test**: `POST /api/institutes/:id/lessons` with `expectedDurationMinutes: 45` → `GET /api/classes/:id/lessons` shows `45` + `status:"pending"`. Omit → `null`. Edit to clear → null.

- [X] T012 [US1] Add optional `expectedDurationMinutes?` (`@IsInt @Min(1) @IsOptional`) to `CreateLessonDto` + `UpdateLessonDto`; add `expectedDurationMinutes`, `status`, `actualStartTime`, `actualEndTime` to `ProgramEntryView`, and `status`/timestamps to `InstituteLessonView.classes[]` in `backend/src/modules/lessons/application/dto/lesson.dto.ts`
- [X] T013 [US1] `CreateLessonUseCase` in `backend/src/modules/lessons/application/lesson.use-cases.ts` — pass `dto.expectedDurationMinutes` into `Lesson.create()`
- [X] T014 [US1] `UpdateLessonUseCase` in same file — when `dto.expectedDurationMinutes !== undefined`, call `this.lessons.hasAnyStartedBinding(lessonId)`; if true throw `BusinessRuleError`; else apply via `lesson.edit()`
- [X] T015 [US1] Persist `expectedDurationMinutes` in `drizzle-lesson.repository.ts` `createLesson` + `updateLesson` inserts/sets; add `hasAnyStartedBinding` query (`lesson_classes` where `lessonId` and `status <> 'pending'`, limit 1)
- [X] T016 [US1] Extend `queryEntries` select + `ProgramEntryRead` mapping in `drizzle-lesson.repository.ts` to include `lessons.expectedDurationMinutes`, `lessonClasses.status`, `actualStartTime`, `actualEndTime`
- [X] T017 [US1] Update `toEntryView` and `groupByLesson` in `class-program.use-case.ts` to map the new fields; apply `deriveReadStatus(raw, date, today)` in BOTH (pass `today`)
- [X] T018 [P] [US1] Unit test `lesson.entity.spec.ts` (extend) — expected-duration validation (null ok, ≥1 ok, 0/negative throws)
- [X] T019 [P] [US1] `add-lesson-dialog.tsx` — optional expected-duration number input (min 1); send in create/update payloads
- [X] T020 [P] [US1] `lesson-card.tsx` — duration chip when set (`durationMinutes` i18n)
- [X] T021 [P] [US1] i18n `expectedDuration`, `durationMinutes` in `messages/ar.json` + `messages/en.json`

**Checkpoint**: Manager sets/edits duration; badge visible; lock enforced.

---

## Phase 4: User Story 2 — Teacher starts and ends a lesson with a live timer (P1)

**Independent Test**: `POST /api/lesson-classes/:id/start` → 204, status `started`. Open timer page, timer counts up, refresh reconstructs. `POST /api/lesson-classes/:id/end` → 200 `{status, actualDurationMinutes}`. Non-owner → 403; double-start → 409; future date → 422.

- [X] T022 [US2] Implement `updateBindingLifecycle` in `drizzle-lesson.repository.ts` — conditional `UPDATE lesson_classes SET status, actual_start_time, actual_end_time WHERE id = ? AND status = ?(expected prior)`; return whether a row changed. Update `findBindingById` reconstitute to include new fields.
- [X] T023 [US2] Add repo read `getBindingTimerView(lessonClassId): Promise<TimerView | null>` — one binding joined to lesson + class, plus its ordinal (`sort+1`) and count of same-class same-date bindings (`ofTotal`); returns name, kind, date, expectedDurationMinutes, status, actualStartTime
- [X] T024 [US2] Create `backend/src/modules/lessons/application/lesson-lifecycle.use-cases.ts` — `StartLessonUseCase`: `findBindingById`→`findLessonById`; assert `actor.userId === binding.teacherId` (else `ForbiddenError`/403); assert `lesson.date <= today` (else `BusinessRuleError`→422); `binding.start(now)`; `updateBindingLifecycle` — if no row changed throw `ConflictError` (409)
- [X] T025 [US2] Same file — `EndLessonUseCase`: owner check (403); load `LessonSettings` (defaults if none); `const mins = binding.end(now)`; `const status = settings.evaluate(mins, lesson.expectedDurationMinutes)`; `binding.applyStatus(status)`; `updateBindingLifecycle` (expect prior `started`, else 409); return `{ status, actualDurationMinutes: mins }`
- [X] T026 [US2] Add `GetLessonTimerUseCase` (teacher-only, must be assigned teacher) delegating to `getBindingTimerView` in `lesson-lifecycle.use-cases.ts`
- [X] T027 [US2] Add routes to `lessons.controller.ts`: `POST lesson-classes/:id/start` (204), `POST lesson-classes/:id/end` (200 body), `GET lesson-classes/:id/timer`
- [X] T028 [US2] Register `StartLessonUseCase`, `EndLessonUseCase`, `GetLessonTimerUseCase` (+ settings repo binding) in `lessons.module.ts`
- [X] T029 [P] [US2] Update `teacher-lessons.use-case.ts` — `toEntryView` already carries new fields (from T017); confirm `today` threaded so `not_given` applies
- [X] T030 [P] [US2] Unit tests `start-lesson.use-case.spec.ts` + `end-lesson.use-case.spec.ts` with in-memory fakes (owner/date/state guards; evaluate wiring)
- [X] T031 [P] [US2] `frontend/src/lib/api.ts` — `startLesson(id)`, `endLesson(id)`, `getLessonTimer(id)`
- [X] T032 [P] [US2] `frontend/src/lib/queries.ts` — `qk.lessonTimer(id)`, `useLessonTimer(id)`
- [X] T033 [P] [US2] Create `frontend/src/features/lessons/lesson-status-badge.tsx` — 6 statuses → label + semantic color token; uses `Badge`
- [X] T034 [US2] `lesson-program.tsx` — Start button when `status==='pending' && date<=TODAY_YMD && actor.userId===teacher.id`; calls `startLesson` then routes to timer; invalidate on success
- [X] T035 [P] [US2] `teacher-lessons-view.tsx` — same Start button logic
- [X] T036 [US2] Create `frontend/src/features/lessons/lesson-timer-page.tsx` — fetch via `useLessonTimer`; `setInterval` elapsed from `actualStartTime`; show name/kind/date/ordinal/expected + progress; End → `AlertDialog` confirm → `endLesson` → show result → route back
- [X] T037 [US2] Create `frontend/src/app/[locale]/dashboard/lesson-timer/[lessonClassId]/page.tsx` — teacher-only; renders timer page
- [X] T038 [P] [US2] `institute-lessons-hub.tsx` `HubLessonRow` — render `LessonStatusBadge` from per-class `status`
- [X] T039 [P] [US2] i18n: 6 status labels + timer strings (`elapsed`, `endLesson`, `endLessonConfirm`, `lessonNofM`) in ar/en

**Checkpoint**: Full start/end flow + timer with refresh resilience; badges everywhere; guards enforced.

---

## Phase 5: User Story 3 — Lesson automatically becomes "Not Given" (P2)

**Independent Test**: Lesson dated yesterday, status `pending` → all reads show `not_given`; no Start button; no DB write.

- [X] T040 [US3] Verify `deriveReadStatus` (T003/T017) covers class program, teacher feed, and hub; add a unit test asserting past-pending → `not_given` and today-pending → `pending`
- [X] T041 [P] [US3] Confirm Start button gated on `status==='pending'` (not `not_given`) — no extra frontend guard needed since server derives it

**Checkpoint**: Past pending lessons read as `not_given`; no writes.

---

## Phase 6: User Story 4 — Over-time / under-time evaluation (P2)

**Independent Test**: threshold 0, expected 5, end immediately → `under_time`. Disable feature → `finished` regardless. No expected duration → `finished`.

- [X] T042 [US4] Create `backend/src/modules/lessons/infrastructure/persistence/drizzle-lesson-settings.repository.ts` — `findByInstitute`; `save` upsert on `institute_id`
- [X] T043 [US4] `GetLessonSettingsUseCase` in `backend/src/modules/lessons/application/lesson-settings.use-cases.ts` — return record or `LessonSettings.defaults(instituteId)` (no persist); assert staff/manager of institute
- [X] T044 [US4] Wire real settings into `EndLessonUseCase` (T025) via `GetLessonSettingsUseCase` (or the settings repo directly)
- [X] T045 [P] [US4] Unit test `lesson-settings.entity.spec.ts` — full evaluate matrix (finished/over/under, threshold 0, disabled, null expected, inclusive boundary)
- [X] T046 [US4] Register `DrizzleLessonSettingsRepository` + `GetLessonSettingsUseCase` in `lessons.module.ts`

**Checkpoint**: Correct terminal status from settings + duration comparison.

---

## Phase 7: User Story 5 — Manager configures lesson settings (P3)

**Scope note**: Backend adds ONLY `LessonSettings` (threshold + enabled). The settings page composes the existing `CategoryManager` component; institute-level visibility default is deferred (documented).

**Independent Test**: Open settings → threshold 10 / toggle on. Change to 20 → `GET` returns 20. Toggle off → over-run lesson ends `finished`.

- [X] T047 [US5] `UpdateLessonSettingsUseCase` in `lesson-settings.use-cases.ts` — assert manager/super_admin (403); validate threshold 0–120; upsert via `settings.update()` + `repo.save()`
- [X] T048 [US5] Add `GET`/`PUT institutes/:id/lesson-settings` routes to `lessons.controller.ts`; register use-case in `lessons.module.ts`
- [X] T049 [P] [US5] `frontend/src/lib/api.ts` — `getLessonSettings(instituteId)`, `updateLessonSettings(instituteId, dto)`
- [X] T050 [P] [US5] `frontend/src/lib/queries.ts` — `qk.lessonSettings(id)`, `useLessonSettings(id)`
- [X] T051 [US5] Create `frontend/src/features/lessons/settings/lesson-settings-form.tsx` — threshold input (0–120), `durationStatusEnabled` switch, save; compose existing `CategoryManager`
- [X] T052 [US5] Create `frontend/src/app/[locale]/dashboard/lessons/settings/page.tsx` — manager-only; renders the form
- [X] T053 [P] [US5] i18n: `lessonSettings`, `durationThreshold`, `durationStatusEnabled`, `durationStatusHint` in ar/en

**Checkpoint**: Manager configures threshold/toggle; effect on next lesson end.

---

## Phase 8: Polish & Cross-Cutting

- [X] T054 `npx tsc --noEmit` in backend + frontend → zero errors
- [X] T055 [P] `npm test` in backend → all lesson specs pass
- [X] T056 [P] `npm run build` in frontend → zero errors
- [X] T057 [P] Verify lesson-card, timer page, settings page in ar RTL + en LTR at 390px, light + dark (semantic tokens only)
- [X] T058 Run `quickstart.md` scenarios end-to-end against the Docker stack

---

## Dependencies

- Phase 2 blocks all stories. Migration (T010) blocks all persistence work.
- US1 (Phase 3) and US2 (Phase 4) both depend only on Phase 2; US2 read fields depend on T016/T017.
- US3 depends on T017 (`deriveReadStatus` wired).
- US4 depends on US2 `EndLessonUseCase` (T025).
- US5 depends on US4 settings repo (T042).
- Phase 8 after all stories.

## Implementation Strategy

**MVP** = Phase 2 → US1 → US2 (manager sets duration, teacher start/end + timer). Validate quickstart 1–4, ship. Then US3 (small), US4 (evaluation), US5 (settings page), polish.

## Notes

- 58 tasks; unit tests included per constitution Quality Gate #2.
- Migration `0004` additive only. Never `drizzle-kit push`. Never `docker compose down -v`.
