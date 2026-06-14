# Spec 004 — Class Enrollment UX, Lesson Times (prayer-aware), Soft Delete & Statistics

**Status:** approved (verbal, 2026-06-13) · **Constitution:** v2.0.0
**Builds on:** specs 001–003

## Features

### 1. Class members — add dialog + actions
Both the Students and Teachers tabs of a class profile get an **Add** dialog with
two modes:
- **Existing**: a dropdown of eligible members.
  - Students: only students **not enrolled in any class** (one-class rule).
  - Teachers: teachers **not already in this class** (teachers may be in many).
- **New**: create a brand-new member (full form) and add them in one step.

Per-row actions in both tabs:
- **Edit** → open the member's profile.
- **Remove from class** → unenroll / detach (membership only).
- **Delete from institute** → **soft delete** the account (see §3).

Teachers tab also keeps **change supervisor** (set a different class teacher as ★).

### 2. Lesson times (أوقات الدروس) — prayer-aware
Renamed from "attendance times". Each weekly slot has a day and a **start
anchor**, with an **optional end anchor**. Each anchor is one of:
- **time** — a clock time `HH:MM`, or
- **prayer** — one of `fajr, dhuhr, asr, maghrib, isha` (الفجر/الظهر/العصر/المغرب/العشاء).

Examples this models:
- between الظهر and العصر → start=prayer:dhuhr, end=prayer:asr
- after المغرب → start=prayer:maghrib, end=none
- 8:00 to الظهر → start=time:08:00, end=prayer:dhuhr

**End is not required.** When both anchors are clock times, end must be after start.

### 3. Soft delete (users)
"Delete from institute" never destroys data — it sets `users.deleted_at`. Soft-
deleted users are excluded from logins, lists, lookups, and stats, and are
removed from all class memberships. Records they authored (e.g. notes) keep their
author id.

### 4. Institute statistics page (post-login landing)
A per-institute stats page becomes the screen shown right after login (and the
first sidebar item). It is designed to grow into a data-rich dashboard. **For
now** it shows counts for the selected institute:
- **employees** (الموظفون = the institute's managers — no separate staff role yet)
- **teachers**, **students**, **classes**.

## Permissions
- Add/remove/soft-delete members, change supervisor, edit schedule: assigned
  manager or super_admin (enroll/remove student also allowed for class teachers).
- Stats + unassigned-students list: institute staff.

## Data model (migration 0003)
```
users.deleted_at         timestamptz null   (soft delete; filtered everywhere)
class_schedule  (redesigned)
  day_of_week  weekday
  start_kind   enum(time, prayer)
  start_value  varchar     ('HH:MM' or prayer key)
  end_kind     enum(time, prayer)  null
  end_value    varchar             null
```

## Out of scope (later)
Dedicated non-teaching "employee" role, attendance records, lesson/activity
content, computed prayer-time clock values, stats charts/time series.
