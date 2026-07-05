# Quickstart Validation: Lesson Lifecycle (009)

## Prerequisites

- Docker Compose stack running (`docker compose up -d`)
- Manager credentials: username + password for an institute with at least one class and one teacher assigned
- Teacher credentials: a teacher assigned to at least one class

## 1. Manager creates a lesson with expected duration

```bash
# 1a. Login as manager → obtain access token (cookie)
# 1b. Create lesson
curl -X POST http://localhost:3001/api/institutes/<instituteId>/lessons \
  -H "Content-Type: application/json" \
  --cookie "token=..." \
  -d '{
    "kind": "lesson",
    "name": "باب تلقي القرآن (3)",
    "date": "2026-07-07",
    "expectedDurationMinutes": 45,
    "assignments": [{ "classId": "<classId>", "teacherId": "<teacherId>" }]
  }'
# Expected: 201 Created
```

**Verify**: `GET /api/classes/<classId>/lessons` — entry has `expectedDurationMinutes: 45`, `status: "pending"`.

## 2. `not_given` lazy evaluation

Create a lesson with `date` set to yesterday (e.g., `2026-07-03`), then:

```bash
GET /api/classes/<classId>/lessons
```

**Verify**: The past-date lesson appears with `status: "not_given"` — no write was made.

## 3. Teacher starts a lesson

```bash
# Login as teacher
curl -X POST http://localhost:3001/api/lesson-classes/<lessonClassId>/start \
  --cookie "token=..."
# Expected: 204 No Content
```

**Verify**: `GET /api/lessons/mine` — that lesson has `status: "started"`, `actualStartTime` set.

**Negative case** — try starting same lesson again:
```bash
# Expected: 409 Conflict
```

**Negative case** — try starting a future-dated lesson:
```bash
# Expected: 422 Unprocessable Entity
```

## 4. Teacher ends a lesson — finished

Wait ≥ 1 second after start, then:

```bash
curl -X POST http://localhost:3001/api/lesson-classes/<lessonClassId>/end \
  --cookie "token=..."
# Expected: 200 OK, body: { "status": "finished", "actualDurationMinutes": 1 }
# (1 min if run within threshold of 45 min expected)
```

## 5. Over-time and under-time evaluation

Create two new lessons with `expectedDurationMinutes: 1`, then:

**Over-time test** (sleep 75 sec to simulate 2 min actual > 1 min expected + 10 min threshold?):
- Actually for quick testing: set `durationThresholdMinutes: 0` in settings then start+end within 1 sec:
  - `actualMinutes = 1`, `expected = 1`, threshold = 0 → `finished` ✓
- For `over_time`: set `durationThresholdMinutes: 0`, `expectedDurationMinutes: 5`, actual = 1 min:
  - `1 < 5 - 0` → `under_time` ✓

```bash
# Update threshold to 0
curl -X PUT http://localhost:3001/api/institutes/<instituteId>/lesson-settings \
  --cookie "token=..." \
  -H "Content-Type: application/json" \
  -d '{ "durationThresholdMinutes": 0, "durationStatusEnabled": true }'
# Expected: 204

# Create lesson with expectedDurationMinutes: 5
# Start lesson → immediately end lesson (actualMinutes ≈ 1)
# End response: { "status": "under_time", "actualDurationMinutes": 1 }
```

## 6. Disable duration evaluation

```bash
curl -X PUT http://localhost:3001/api/institutes/<instituteId>/lesson-settings \
  --cookie "token=..." \
  -H "Content-Type: application/json" \
  -d '{ "durationThresholdMinutes": 0, "durationStatusEnabled": false }'
# Expected: 204

# Start and immediately end a lesson with expectedDurationMinutes: 60
# Expected end response: { "status": "finished", ... }
```

## 7. `expectedDurationMinutes` lock after start

```bash
# With a lesson currently in 'started' state:
curl -X PATCH http://localhost:3001/api/lessons/<lessonId> \
  --cookie "token=..." \
  -H "Content-Type: application/json" \
  -d '{ "expectedDurationMinutes": 99 }'
# Expected: 400 Business rule — cannot edit duration after lesson has started
```

## 8. Frontend timer page

1. Login as teacher, open `/ar/dashboard/my-lessons`.
2. Find a `pending` lesson for today — a "Start" button is visible.
3. Press Start → redirected to `/ar/dashboard/lesson-timer/<lessonClassId>`.
4. Timer counts up from 0 in real time.
5. Refresh the page — timer reconstructs from server-stored `actualStartTime` (no restart).
6. Press "End lesson" → confirmation dialog → confirm → status badge updates.

## 9. Lesson settings page

1. Login as manager, open `/ar/dashboard/lessons/settings`.
2. See current threshold (default 10) and toggle (default on).
3. Change threshold to 20, save → `GET /api/institutes/<id>/lesson-settings` returns `durationThresholdMinutes: 20`.

## 10. Multi-tenant rejection

```bash
# Login as teacher of institute A, try to start a lesson belonging to institute B
curl -X POST http://localhost:3001/api/lesson-classes/<bindingFromInstituteB>/start \
  --cookie "token=<instituteATeacher>"
# Expected: 403 Forbidden
```

## Definition of Done checklist

- [ ] `GET /api/classes/:classId/lessons` includes `status`, `expectedDurationMinutes`, `actualStartTime`, `actualEndTime`
- [ ] `not_given` returned lazily for past-date pending lessons
- [ ] Start endpoint rejects non-owner and future-date lessons
- [ ] End endpoint correctly assigns `finished`, `over_time`, `under_time`
- [ ] Settings endpoint returns defaults when no record exists
- [ ] `expectedDurationMinutes` locked once any binding is started
- [ ] Timer page reconstructs after page refresh
- [ ] Both locales (ar / en) render status labels correctly
- [ ] Light + dark theme verified on timer page and settings page
- [ ] Migration `0004` applied cleanly on top of `0003`
