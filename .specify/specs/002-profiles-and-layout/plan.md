# Plan 002 — App Layout + Teacher & Student Profiles

## Constitution compliance
- Clean Architecture: new `profiles` module with the 4 layers; Drizzle stays in
  infrastructure. Reuse `InstituteAccessPolicy` (institutes module) for tenancy.
- Reuse over duplication: extend the existing `User` aggregate + `UserRepository`
  rather than a parallel model; one shared frontend `DataTable`, one `ProfileField`.
- Both locales + both themes; mobile-first; semantic tokens only.

## Backend

### users module (extend)
- `shared/domain`: add `StudyDegree`, `TajweedLevel` enums.
- `User` entity: add nullable teacher fields + mutators `editBasicInfo(...)`,
  `editTeacherDetails(...)`; enforce **birthDate not future** + phone shape in a
  shared `validateProfileInput` used by create + edit.
- `UserRepository`: add `delete(id)` (save already upserts for updates).

### profiles module (new)
- domain: `TeacherCertification`, `StudentNote` entities + repo ports
  (`CERTIFICATION_REPOSITORY`, `STUDENT_NOTE_REPOSITORY`).
- application use-cases (each takes an `Actor`, authorises, tenant-scopes):
  - `GetTeacherProfileUseCase` — returns basic always; extended only for
    manager/super_admin (stripped otherwise) + the teacher's classes.
  - `UpdateTeacherUseCase` — basic + extended (manager/super_admin).
  - `AddCertificationUseCase` / `RemoveCertificationUseCase`.
  - `GetStudentProfileUseCase` — details + current class (staff only).
  - `UpdateStudentUseCase` (teacher/manager/super_admin).
  - `AddNote/ListNotes/UpdateNote/DeleteNote` — author recorded; **never** for students.
  - `ChangeStudentClassUseCase` — transfer (remove existing enrollment(s) → add).
  - `DeleteMemberUseCase` — delete teacher/student (manager/super_admin; teacher may delete students).
- Access helpers (extend `InstituteAccessPolicy` or a local `ProfilePolicy`):
  `assertManagerOf` (extended teacher data), `assertStaffOf` (student data).
- infra: `*.schema.ts` (certifications, notes) + Drizzle repos; extend user schema.
- presentation: `ProfilesController`
  (`/institutes/:id/teachers/:tid`, `.../students/:sid`, notes, certifications,
  `PUT students/:sid/class`).

### classes module (extend)
- `ClassRepository.findClassesByTeacher(teacherId)` and
  `findCurrentClassOfStudent(studentId)` for the profile views;
  `removeStudentFromAllClasses(studentId, instituteId)` for transfer.

### DB
One new migration: alter `users` (+4 cols, 2 enums) + create
`teacher_certifications`, `student_notes`. `npm run db:generate` → review → run.

## Frontend

### Layout
- `app/[locale]/dashboard/layout.tsx` → `AppShell` (server) wrapping an
  `InstituteProvider` (client context: selected institute, persisted in
  `localStorage` key `jeel.institute.<userId>`).
- `features/layout/`: `Sidebar`, `Topbar`, `app-shell.tsx`, `institute-context.tsx`,
  `theme-toggle.tsx`. Mobile: sidebar in a shadcn `Sheet` opened from a hamburger.
- Add shadcn `sheet`, `dropdown-menu`, `textarea`, `avatar`. Add `next-themes`
  for flash-free dark mode; `ThemeProvider` in the locale layout, `.dark` strategy.

### Pages (institute-scoped, read selected institute from context)
- `dashboard/page.tsx` → super_admin: institutes management; others: redirect to teachers.
- `dashboard/teachers/page.tsx` → `DataTable` (name, username, phone, actions
  edit/delete) → row click routes to profile.
- `dashboard/teachers/[teacherId]/page.tsx` → `TeacherProfile` (basic card;
  extended card gated by role; certifications add/remove; classes list).
- `dashboard/students/page.tsx` → `DataTable` (+ school grade).
- `dashboard/students/[studentId]/page.tsx` → `StudentProfile` (details edit;
  current class + change-class select; notes CRUD with author).
- Reusable: `features/shared/data-table.tsx`, `confirm-dialog.tsx`,
  `profile-field.tsx`. New API client functions for every endpoint.

## Verification
- Backend unit test for the transfer + note-author rules.
- Extend `scripts/verify-core-scenario.sh` (or add `verify-profiles.sh`):
  create teacher → set extended details → add/remove certification →
  teacher token cannot read extended (stripped) → add student note →
  student token cannot list notes (403) → change student class → assert state.
- `docker compose up` fresh; manual UI pass in ar/RTL + en, light + dark, mobile width.
