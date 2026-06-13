# Spec 003 — Class Profile, Schedules, Uploads & UI Polish

**Status:** approved (verbal, 2026-06-13) · **Constitution:** v2.0.0
**Builds on:** spec 001 (tenancy), spec 002 (profiles/layout)

## Confirmed decisions
- Student grade is a dropdown of **12 grades**, last = **البكالوريا**
  (keys `g1..g12`; labels in i18n; `g12` → البكالوريا).
- Institute logo: **image upload** (new file-storage infra) + shown in the UI.
- UI font: **Tajawal** (Arabic + Latin).

## Features

### 1. Student grade dropdown
`schoolGrade` becomes a constrained value (`g1..g12`), validated server-side and
chosen from a dropdown on create/edit.

### 2. Class profile page (tabs) + full CRUD
Each class (حلقة) gets a profile at `/dashboard/classes/:id` with tabs:
1. **Students** — enroll/remove, view; row → student profile.
2. **Teachers** — add/remove teachers, set the **supervisor**.
3. **Details** — edit name/description; **attendance times** as a weekly
   calendar (أوقات الحضور / lesson times).
4. **Lessons** — placeholder (empty for now).
5. **Activities** — placeholder (empty for now).
Class CRUD: create, **update** (name/description), **delete**, add/remove
teacher, set supervisor, enroll/remove student.

### 3. Weekly schedule (attendance/lesson times)
Per class: recurring weekly slots `{ dayOfWeek (sat…fri), startTime, endTime }`.
Managed by managers; shown to all institute staff as a weekly calendar grid.

### 4. Institute logo upload
Generic authenticated image upload (`POST /api/uploads/image`) → stored on a
Docker volume, served at `/uploads/...`. Institutes gain an **update** endpoint
(name/place/description/logo). Logo shown in topbar, institute list, headers.

### 5. UI polish
- Switch the font family to **Tajawal**.
- Friendlier visuals: avatars/initials, clearer cards, spacing, headers.
- Teacher profile reworked with a header + cleaner sections.

## Permissions
- Class read (profile, schedule): institute staff (super_admin, assigned
  manager, teacher of institute).
- Class write (create/update/delete, teachers, supervisor, schedule): assigned
  manager or super_admin. Enroll/remove student: also teachers of the class.
- Institute update / logo: assigned manager or super_admin.
- Upload: any authenticated staff (manager/super_admin/teacher).

## Data model (additions)
```
class_schedule  id, class_id→classes(cascade), day_of_week enum(sat..fri),
                start_time varchar('HH:MM'), end_time varchar('HH:MM')
users.school_grade : now holds a grade key (g1..g12); still varchar
institutes.logo_url : now may hold a relative /uploads path (validation relaxed)
```

## Out of scope (later)
Lessons content, activities content, attendance *records* (presence per
session), recurring-exceptions, image resizing/CDN.
