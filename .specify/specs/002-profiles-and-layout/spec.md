# Spec 002 — App Layout + Teacher & Student Profiles

**Status:** approved (verbal, 2026-06-12) · **Constitution check:** v2.0.0 compliant
**Builds on:** spec 001 (institutes, auth, classes)

## Summary

A responsive app shell (sidebar + topbar) scoped to a selected institute, plus
rich teacher and student profiles with role-gated fields, collection sub-data
(certifications, notes), validation, and student class transfer.

## Confirmed decisions
- A student belongs to **one class at a time**; "change class" transfers them.
- Study degree is a dropdown: **ثانوية، دبلوم، بكالوريوس/إجازة، ماجستير، دكتوراه**.
- Tajweed level is a 5-level rating: **ممتاز، جيد جداً، جيد، مقبول، ضعيف**.

## Layout (mobile-first)
- **Topbar**: app name, **selected-institute picker** (persisted per user in
  localStorage), theme toggle (light/dark), locale switch, user menu (logout).
- **Sidebar**: Teachers, Students, Classes (and Institutes for super_admin).
  Collapses to a slide-over drawer on mobile (hamburger in topbar).
- All staff pages operate within the selected institute (tenant context).

## Teacher profile
**Basic info** (first/last name, username, birth date, phone): visible to the
teacher (self), assigned manager, super_admin. Editable by manager/super_admin.

**Extended details — visible AND editable by manager/super_admin ONLY** (not the
teacher):
- `studyDegree` (dropdown), `studyField` (text)
- **العلم الشرعي (Islamic knowledge)**:
  - `quranPartsMemorized` — أجزاء من القرآن (integer 0–30)
  - `tajweedLevel` (dropdown rating)
  - **certifications** المعاهد والدورات الشرعية — a list the user can add/remove
- Also shown: **the classes this teacher is part of** (read from class_teachers).

## Student profile
Basic + details (first/last name, username, birth date, phone, school grade):
**view + edit by teacher (of institute), manager, super_admin**.
- **Notes** — multiple, full CRUD, each records its **author** and timestamps.
  **Students can never see notes.**
- **Current class** + a control to **change/transfer** the student to another
  class of the same institute.

## Validation (server + client)
- **Phone**: `^\+?[0-9]{7,15}$` (optional leading +, 7–15 digits).
- **Birth date**: a valid date that is **not in the future**.
- Enforced in DTOs (class-validator) and in the domain entity.

## Permissions (extends spec 001 matrix)
| Action | super_admin | manager (assigned) | teacher (same institute) | student |
| --- | --- | --- | --- | --- |
| List/▸ teacher basic | ✔ | ✔ | self only | ✖ |
| View/edit teacher extended | ✔ | ✔ | ✖ | ✖ |
| Edit teacher basic, delete teacher | ✔ | ✔ | ✖ | ✖ |
| View/edit student details | ✔ | ✔ | ✔ | self basic only |
| Student notes CRUD | ✔ | ✔ | ✔ | ✖ (never) |
| Change student class, delete student | ✔ | ✔ | ✔ | ✖ |

## Data model (additions)
```
users (+ columns, all nullable, teacher-scoped):
  study_degree   enum(secondary,diploma,bachelor,master,phd)
  study_field    varchar
  quran_parts    smallint (0..30)
  tajweed_level  enum(excellent,very_good,good,acceptable,weak)

teacher_certifications  id, teacher_id→users, title, created_at
student_notes           id, student_id→users, author_id→users, body,
                        created_at, updated_at
```
"One class at a time" reuses `class_students` from spec 001 but the transfer
use-case guarantees a student has at most one row (remove existing → add new).

## Out of scope (later)
Lessons, points/grades, attendance, statistics, audit log, file uploads,
note threading.
