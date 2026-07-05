# API Contracts: Lesson Lifecycle (009)

All endpoints require a valid JWT cookie. Errors follow the standard envelope
`{ success, statusCode, message, timestamp, path }`.

---

## Extended: Create lesson

`POST /api/institutes/:instituteId/lessons`

New optional field in request body:
```json
{
  "expectedDurationMinutes": 45
}
```
- `expectedDurationMinutes`: positive integer ≥ 1, or omit/null for "no duration".

Response unchanged (201 Created, returns created lesson id + bindings).

---

## Extended: Update lesson

`PATCH /api/lessons/:lessonId`

New optional field:
```json
{
  "expectedDurationMinutes": 60
}
```
- Rejected with `400 Business rule` if any binding for this lesson has `status !== 'pending'`.

---

## New: Start lesson

`POST /api/lesson-classes/:lessonClassId/start`

**Authorization**: Teacher assigned to this `lessonClassId` only.

**Preconditions**:
- Binding `status` is `pending`.
- `lesson.date <= today` (can't start a future lesson).

**Side effects**: Sets `status = 'started'`, `actual_start_time = now()` (server clock).

**Response**: `204 No Content`

**Errors**:
- `403` — caller is not the assigned teacher.
- `409` — lesson not in `pending` state.
- `422` — lesson date is in the future.

---

## New: End lesson

`POST /api/lesson-classes/:lessonClassId/end`

**Authorization**: Teacher assigned to this `lessonClassId` only.

**Preconditions**: Binding `status` is `started`.

**Side effects**:
1. Sets `actual_end_time = now()`.
2. Loads `LessonSettings` for the institute.
3. Computes `actualMinutes = ceil((endTime − startTime) / 60 000)`.
4. Derives final status using the `LessonSettings.evaluate()` rule.
5. Persists `status`, `actual_end_time`.

**Response**: `200 OK`
```json
{
  "status": "finished",
  "actualDurationMinutes": 47
}
```

**Errors**:
- `403` — caller is not the assigned teacher.
- `409` — lesson not in `started` state.

---

## New: Get lesson settings

`GET /api/institutes/:instituteId/lesson-settings`

**Authorization**: Manager or super_admin of the institute.

**Response**: `200 OK`
```json
{
  "durationThresholdMinutes": 10,
  "durationStatusEnabled": true
}
```
Returns defaults if no record has been saved yet.

---

## New: Update lesson settings

`PUT /api/institutes/:instituteId/lesson-settings`

**Authorization**: Manager or super_admin.

**Request body**:
```json
{
  "durationThresholdMinutes": 15,
  "durationStatusEnabled": true
}
```
- `durationThresholdMinutes`: integer 0–120.
- `durationStatusEnabled`: boolean.

**Response**: `204 No Content`

---

## Extended: Class program read

`GET /api/classes/:classId/lessons`

`ProgramEntry` items now include:
```json
{
  "lessonClassId": "...",
  "status": "pending",
  "expectedDurationMinutes": 45,
  "actualStartTime": null,
  "actualEndTime": null,
  "sort": 0
}
```
- `status` is `not_given` (virtual) when `status === 'pending'` and `lesson.date < today`.

---

## Extended: Teacher's lessons

`GET /api/lessons/mine`

Same `status`, `expectedDurationMinutes`, `actualStartTime`, `actualEndTime` fields added.

---

## Extended: Institute lessons hub

`GET /api/institutes/:instituteId/lessons`

`classes[n]` items now include:
```json
{
  "lessonClassId": "...",
  "classId": "...",
  "className": "...",
  "status": "started",
  "actualStartTime": "2026-07-04T09:15:00Z",
  "actualEndTime": null,
  "teacher": { "id": "...", "name": "..." }
}
```

---

## Frontend routes (new)

| Route | Component | Access |
|---|---|---|
| `/dashboard/lesson-timer/[lessonClassId]` | `LessonTimerPage` | Assigned teacher only |
| `/dashboard/lessons/settings` | `LessonSettingsPage` | Manager + super_admin only |
