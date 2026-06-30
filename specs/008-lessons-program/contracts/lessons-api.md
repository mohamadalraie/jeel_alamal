# API Contracts: Class Lessons Program

All endpoints are under the global `/api` prefix, require authentication (global JWT AuthGuard; non-public), and return the standard error envelope `{ success, statusCode, message, timestamp, path }` on failure. Authorisation is enforced in the use-case via the actor context. Bodies are validated by the global ValidationPipe (unknown fields rejected).

Roles: **M** = institute_manager (or super_admin), **T** = teacher, **S** = student. "staff" = manager+teacher.

## Categories (manager)

### `POST /api/institutes/:instituteId/lesson-categories` — M
Body: `{ name: string, color: string }` → `201` `{ id, name, color }`

### `GET /api/institutes/:instituteId/lesson-categories` — staff
→ `200` `[{ id, name, color }]`

### `PATCH /api/lesson-categories/:categoryId` — M
Body: `{ name?: string, color?: string }` → `204`

### `DELETE /api/lesson-categories/:categoryId` — M
→ `204` (lessons that used it become uncategorized via SET NULL)

## Lessons (manager mutations)

### `POST /api/institutes/:instituteId/lessons` — M
Create a lesson (or recitation) and schedule it to one or more classes.
Body:
```jsonc
{
  "kind": "lesson" | "recitation",
  "name": "string|null",          // required when kind=lesson; ignored for recitation
  "description": "string|null",
  "categoryId": "uuid|null",       // lesson only
  "date": "YYYY-MM-DD",
  "sources": [                      // lesson only; omitted/empty for recitation
    { "kind": "link"|"image"|"pdf", "url": "string", "description": "string|null" }
  ],
  "assignments": [                  // >= 1
    { "classId": "uuid", "teacherId": "uuid" }
  ]
}
```
→ `201` `{ lessonId }`. Validates: name required for lesson; recitation carries no name/desc/category/sources; ≥1 assignment; each class+teacher in the institute; teacher eligible to teach (teacher of institute or assigned manager).

### `PATCH /api/lessons/:lessonId` — M
Update shared content. Body: any of `{ name, description, categoryId, date, sources, assignments }`. When `assignments` is provided it replaces the binding set (add/remove classes, change per-class teacher); shared content edits apply to the single definition. → `204`

### `DELETE /api/lessons/:lessonId` — M
Delete the lesson, its sources, and all its class bindings. → `204`

### `DELETE /api/lesson-classes/:lessonClassId` — M
Remove the lesson from ONE class (leaves the shared lesson + other classes intact). → `204`

### `PUT /api/classes/:classId/lessons/order` — M
Body: `{ date: "YYYY-MM-DD", orderedLessonClassIds: ["uuid", ...] }` → `204` (sets `sort` for that class's day)

## Program reads

### `GET /api/classes/:classId/lessons` — staff (manager + teacher of institute)
Full class program. Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (optional week window).
→ `200`
```jsonc
{
  "lessonsVisibleToStudents": false,
  "entries": [
    {
      "lessonClassId": "uuid", "lessonId": "uuid",
      "kind": "lesson", "name": "...", "description": "...",
      "category": { "id":"uuid","name":"...","color":"#.." } | null,
      "date": "YYYY-MM-DD", "sort": 0,
      "teacher": { "id":"uuid", "name":"..." },
      "sources": [ { "kind":"link","url":"...","description":"..." } ]
    }
  ]
}
```

### `GET /api/classes/:classId/lessons/student` — S (own class) / staff
Gated past-only projection. Returns `403`/empty when the class flag is off or the actor is not a student of the class. Entries are `date <= today`, projecting only `{ lessonClassId, kind, name, description, date }` (no sources, no future, recitation shows label).
→ `200` `{ entries: [...] }`

### `GET /api/lessons/mine` — T (actor)
The teacher's assigned lessons across classes, sorted by date then sort, with the next upcoming flagged.
→ `200`
```jsonc
{
  "entries": [
    { "lessonClassId":"uuid","lessonId":"uuid","kind":"lesson","name":"...",
      "description":"...","category":{...}|null,"date":"YYYY-MM-DD",
      "className":"...","sources":[...],"isNext": true }
  ]
}
```

## Visibility toggle (manager)

### `PUT /api/classes/:classId/lessons-visibility` — M
Body: `{ visible: boolean }` → `204`. (The flag is also returned by `GET /api/classes/:classId` profile.)

## Uploads (sources) — extension of existing module

### `POST /api/uploads/pdf` — staff
multipart `file` (`.pdf`, ≤ ~10 MB) → `201` `{ url: "/uploads/<id>.pdf" }`
(Images reuse the existing `POST /api/uploads/image`.)

## Authorisation summary

| Endpoint | Allowed |
|---|---|
| categories create/update/delete, lessons create/update/delete, lesson-class remove, order, visibility | manager (assertManagerOf) |
| categories list, class program | staff of institute (assertStaffOf) |
| my lessons | the teacher actor |
| class lessons (student) | a student of that class, only if flag on |
| uploads image/pdf | any authenticated staff |
