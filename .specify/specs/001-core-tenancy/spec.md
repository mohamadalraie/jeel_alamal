# Spec 001 — Core Tenancy: Institutes, Auth, Classes (حلقات)

**Status:** approved (verbal, 2026-06-11) · **Constitution check:** v2.0.0 compliant

## Summary

The foundational multi-tenant scenario: the super admin creates institutes and
their managers; managers open one of their institutes and manage teachers,
classes (حلقات), and students.

## Actors & permissions

| Action | super_admin | institute_manager | teacher | student |
| --- | --- | --- | --- | --- |
| Create institute (+ its manager account) | ✔ | ✖ | ✖ | ✖ |
| List institutes | all | assigned only | ✖ | ✖ |
| Create teacher account | ✖ | ✔ (assigned institute) | ✖ | ✖ |
| Create student account | ✖ | ✔ (assigned institute) | ✔ (own institute) | ✖ |
| Create class (حلقة) | ✖ | ✔ (assigned institute) | ✖ | ✖ |
| Add teacher to class / set supervisor | ✖ | ✔ (assigned institute) | ✖ | ✖ |
| Enroll student in class | ✖ | ✔ (assigned institute) | ✔ (their class only) | ✖ |

All other combinations are denied (deny by default).

## Functional requirements

1. **Login** for ALL roles by **unique username** + password.
   JWT access (~15 min) + refresh with rotation (~7 days), httpOnly cookies.
2. **Super admin** (exactly one, seeded from env) creates an institute with:
   name, place, logo, description — and its **manager account**
   (first name, last name, birth date, phone, username, password) atomically
   (one transaction: institute + user + assignment).
3. A **manager may manage many institutes** (assignment = join table).
   After login the manager picks an institute; the choice is persisted in
   `localStorage` per user and restored on next login.
4. **Teacher account**: first/last name, birth date, username, phone, password.
   Belongs to one institute.
5. **Student account**: first/last name, phone, school grade, birth date,
   username, password. Belongs to one institute.
6. **Class (حلقة)**: name, description; belongs to one institute; has many
   teachers of whom **exactly one is supervisor** (DB-enforced); has many students.
7. Cross-institute data access is impossible for non-super-admin actors.

## Data model

```
users             id, username (uq), password_hash, role, first_name, last_name,
                  birth_date, phone, school_grade (students), institute_id
                  (teachers/students; null for super_admin/managers), created_at
institutes        id, name, place, logo_url, description, created_at
manager_institutes  manager_id → users, institute_id → institutes  (PK both)
classes           id, institute_id → institutes, name, description, created_at
class_teachers    class_id → classes, teacher_id → users, is_supervisor
                  (PK class+teacher; partial UNIQUE(class_id) WHERE is_supervisor)
class_students    class_id → classes, student_id → users, enrolled_at (PK both)
refresh_tokens    id, user_id → users, token_hash (uq), expires_at, created_at
```

## Documented assumptions (cheap to change by migration)

- A teacher/student belongs to exactly ONE institute. Managers are M:N.
- No email field — username is the sole login identifier (per requirements).
- Institute logo is a URL string for now; file upload is a later feature.
- Migration squash: the pre-release migration set was regenerated as one clean
  initial migration (allowed only before first production deploy).

## Out of scope (next specs)

Lessons, points, statistics, teacher dashboard UI, student portal, role
management UI, password reset, file uploads.
