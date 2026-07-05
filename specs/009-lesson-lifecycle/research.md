# Research: Lesson Lifecycle (009)

## Status placement: binding vs. shared lesson

**Decision**: Status (`pending`, `started`, `finished`, …) lives on `lesson_classes` (the binding), **not** on `lessons` (the shared definition).

**Rationale**: The same lesson content is shared across multiple class bindings. Each class's teacher starts and ends independently. Putting status on the shared lesson would mean one teacher's action changes what all other teachers see — wrong.

`expectedDurationMinutes` lives on the shared `lessons` table because it is content metadata set by the manager when authoring the lesson, not per-delivery.

**Alternatives considered**: "Copy expected duration into each binding at creation time" — rejected because it creates duplication and divergence when managers edit the duration.

---

## `not_given` strategy: lazy vs. eager

**Decision**: Lazy evaluation on read — any binding with status `pending` and `lesson.date < today` is returned as `not_given` in the read model without a DB write.

**Rationale**: A nightly job would have to scan every institute for overdue lessons; lazy evaluation is O(read), has no async failure mode, and requires no scheduler setup. Existing `status` column defaults to `pending`, so historical lessons automatically become `not_given` without a migration.

**Alternatives considered**: Scheduled cron job — deferred to a future extension if reporting aggregates require a persisted `not_given` status.

---

## Duration threshold: where to enforce

**Decision**: Evaluated in `EndLessonUseCase` (application layer) by reading `LessonSettings` for the institute.

**Rationale**: Clean Architecture rule — business logic in the application layer, not the DB trigger or frontend. `LessonSettings` is loaded within the same use-case transaction as the binding update.

**Alternatives considered**: Frontend-only — rejected; server-side status must be authoritative. DB trigger — rejected; violates layer separation.

---

## `LessonSettings` table: upsert vs. pre-populate

**Decision**: Upsert on first read/write. `GetLessonSettingsUseCase` returns defaults if no record exists. `UpdateLessonSettingsUseCase` creates or updates atomically.

**Rationale**: Avoids a migration that touches all existing institutes. Defaults (`durationThresholdMinutes=10`, `durationStatusEnabled=true`) are baked into the use-case, not stored, until a manager explicitly changes them.

**Alternatives considered**: Pre-populate via migration — adds complexity and ties the migration to app logic. Defaults column in `institutes` table — rejected; settings belong to the lessons bounded context.

---

## Timer page: route & session resilience

**Decision**: Dedicated client route `lesson-timer/[lessonClassId]` that reconstructs elapsed time from `actualStartTime` on mount. No WebSocket or SSE needed — a simple `setInterval` on the client is sufficient.

**Rationale**: `actualStartTime` is stored server-side on start. If the page is refreshed, the component calls `GET /lesson-classes/:id` (or the class program endpoint), reads `actualStartTime`, and computes elapsed = `now − actualStartTime`. No additional server round-trip after the initial load.

**Alternatives considered**: Server-sent events for a "live" server clock — rejected; the server doesn't need to push time, the client clock is accurate enough for display purposes.

---

## `expectedDurationMinutes` lock after start

**Decision**: `UpdateLessonUseCase` reads all bindings for the lesson; if any binding has `status !== pending`, the update of `expectedDurationMinutes` is rejected with a `BusinessRuleError`.

**Rationale**: Once a teacher has started, the evaluation basis must be immutable. Changing it mid-delivery would make the final status non-deterministic.

---

## Lesson ordering / ordinal display

**Decision**: The existing `sort` column on `lesson_classes` (smallint, default 0) is already the ordering key from spec 008. For display, sort ascending and show `sort + 1` as the human-readable ordinal (1-indexed).

**Rationale**: No new column needed. `ReorderClassDayUseCase` already manages `sort`. The display ordinal is `Math.max(sort + 1, 1)` shown only when the day has ≥ 2 lessons.

---

## New migration number

The last migration is `0003_material_veda.sql`. This spec requires migration `0004`.

**Schema additions**:
- `lesson_binding_status` pgEnum: `pending | started | finished | not_given | over_time | under_time`
- `lessons.expected_duration_minutes` — `INTEGER` nullable
- `lesson_classes.status` — `lesson_binding_status NOT NULL DEFAULT 'pending'`
- `lesson_classes.actual_start_time` — `TIMESTAMPTZ` nullable
- `lesson_classes.actual_end_time` — `TIMESTAMPTZ` nullable
- New table `lesson_settings` — `id UUID PK, institute_id UUID UNIQUE FK→institutes(cascade), duration_threshold_minutes SMALLINT NOT NULL DEFAULT 10, duration_status_enabled BOOLEAN NOT NULL DEFAULT true, updated_at TIMESTAMPTZ`
