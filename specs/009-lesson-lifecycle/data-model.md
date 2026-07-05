# Data Model: Lesson Lifecycle (009)

## Migration: `0004` (additive only — no existing rows changed)

### New enum

```sql
CREATE TYPE lesson_binding_status AS ENUM (
  'pending', 'started', 'finished', 'not_given', 'over_time', 'under_time'
);
```

### Extended: `lessons` table

```
+ expected_duration_minutes  INTEGER  nullable
```

- Set by manager at creation; editable until any binding for this lesson is `started`.
- `NULL` means "no expected duration" → evaluation always yields `finished`.
- Minimum value: 1 (validated in DTO and domain).

### Extended: `lesson_classes` table

```
+ status           lesson_binding_status  NOT NULL  DEFAULT 'pending'
+ actual_start_time  TIMESTAMPTZ           nullable
+ actual_end_time    TIMESTAMPTZ           nullable
```

- `status` transitions: `pending → started → finished | over_time | under_time`
- `not_given` is never written; it is computed lazily on read when `status = 'pending'` and `lesson.date < today`.
- `actual_start_time` is set atomically with the `pending → started` transition.
- `actual_end_time` is set atomically with the `started → final` transition.

### New table: `lesson_settings`

```
id                         UUID          PRIMARY KEY
institute_id               UUID          UNIQUE  NOT NULL  FK→institutes(cascade)
duration_threshold_minutes SMALLINT      NOT NULL  DEFAULT 10
duration_status_enabled    BOOLEAN       NOT NULL  DEFAULT true
updated_at                 TIMESTAMPTZ   NOT NULL  DEFAULT now()
```

- One row per institute, created on first save (upsert).
- `duration_threshold_minutes = 0` is treated as disabled (same as `duration_status_enabled = false`).

---

## Domain entities (backend)

### `LessonBindingStatus` value (new enum domain file)

```
domain/lesson-binding-status.ts
export type LessonBindingStatus =
  | 'pending' | 'started' | 'finished'
  | 'not_given' | 'over_time' | 'under_time';
```

### `Lesson` entity (extended)

New property: `expectedDurationMinutes: number | null`

New method: `setExpectedDuration(minutes: number | null): void`
- Throws `BusinessRuleError` if called when `status !== 'pending'` on ANY binding (checked in use-case, not entity).
- Validates: `minutes === null || minutes >= 1`.

### `LessonClassBinding` entity (extended)

New properties:
- `status: LessonBindingStatus`
- `actualStartTime: Date | null`
- `actualEndTime: Date | null`

New methods:
- `start(now: Date): void` — transitions `pending → started`; throws if not `pending`.
- `end(now: Date, settings: LessonSettingsData): void` — transitions `started → final`; computes status via `computeFinalStatus()`.

### `LessonSettings` entity (new)

Properties: `instituteId`, `durationThresholdMinutes`, `durationStatusEnabled`

Methods: `update({ thresholdMinutes, enabled })`, `evaluate(actualMinutes, expectedMinutes): FinalStatus`

`evaluate` logic:
```
if (!enabled || thresholdMinutes <= 0 || expectedMinutes === null) → 'finished'
if actualMinutes > expectedMinutes + thresholdMinutes → 'over_time'
if actualMinutes < expectedMinutes - thresholdMinutes → 'under_time'
otherwise → 'finished'
```

### `LessonSettingsRepository` port (new)

```typescript
interface LessonSettingsRepository {
  findByInstitute(instituteId: string): Promise<LessonSettings | null>;
  save(settings: LessonSettings): Promise<void>;
}
```

---

## Read model additions

### `ProgramEntryView` (extended — all reads)

```typescript
status: LessonBindingStatus;      // 'pending' | 'started' | 'finished' | 'not_given' | 'over_time' | 'under_time'
expectedDurationMinutes: number | null;
actualStartTime: string | null;   // ISO timestamp
actualEndTime: string | null;     // ISO timestamp
sort: number;                     // already exists — confirmed used for ordinal
```

### `InstituteLessonView` (extended — hub)

Each binding in `classes[]` also carries:
```typescript
status: LessonBindingStatus;
actualStartTime: string | null;
actualEndTime: string | null;
```

### `LessonSettingsView` (new read model)

```typescript
interface LessonSettingsView {
  durationThresholdMinutes: number;
  durationStatusEnabled: boolean;
}
```

---

## Frontend types (`lib/types.ts`)

```typescript
export type LessonBindingStatus =
  | 'pending' | 'started' | 'finished'
  | 'not_given' | 'over_time' | 'under_time';

export interface LessonSettings {
  durationThresholdMinutes: number;
  durationStatusEnabled: boolean;
}
```

`ProgramEntry` gains: `status`, `expectedDurationMinutes`, `actualStartTime`, `actualEndTime`.
`InstituteLesson.classes[n]` gains: `status`, `actualStartTime`, `actualEndTime`.
