# Tasks: Scheduled Lessons Materialization & Lesson Reports with n8n Webhook

**Input**: Design documents from `specs/012-lesson-scheduling-reports/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md)  
**Organization**: Tasks grouped by phase and priority. Foundational phase (Phase 2) must complete before story phases.

---

## Format: `[ID] [P?] [Story?] Description`
- **[P]**: Can run in parallel with other [P] tasks in the same phase.
- **[Story]**: User story identifier (US1 to US5).

---

## Phase 1: Setup & Audit
- [x] T001 Verify database connection and Drizzle migration state.
- [x] T002 Inspect existing lesson timer notes and weekly schedule use-cases.

---

## Phase 2: Foundational (Schema, Domain & Ports)
- [x] T003 Create `backend/src/modules/lessons/domain/lesson-report.entity.ts` with properties, `create()`, `reconstitute()`, `update()`, and webhook status modifiers.
- [x] T004 [P] Create `backend/src/modules/lessons/domain/lesson-report.repository.ts` defining `LESSON_REPORT_REPOSITORY` port (`findByBindingId`, `create`, `update`, `findById`).
- [x] T005 [P] Create `backend/src/modules/lessons/domain/webhook-dispatcher.port.ts` defining `WEBHOOK_DISPATCHER` port (`dispatchReport(payload, url, secret): Promise<{ success: boolean; error?: string }>`).
- [x] T006 Extend `backend/src/modules/lessons/domain/lesson-settings.entity.ts` to include `webhookUrl`, `webhookSecret`, and `webhookEnabled`.
- [x] T007 Create `backend/src/modules/lessons/infrastructure/persistence/lesson-report.schema.ts` defining `lessonReportWebhookStatusEnum` and `lessonReports` table.
- [x] T008 Update `backend/src/modules/lessons/infrastructure/persistence/lesson.schema.ts` to add `webhookUrl`, `webhookSecret`, and `webhookEnabled` to `lessonSettings`.
- [x] T009 Run `npm run db:generate` in `backend`, review the generated SQL migration `0015_bouncy_orphan.sql`.
- [x] T010 [P] Implement `drizzle-lesson-report.repository.ts` under `backend/src/modules/lessons/infrastructure/persistence/`.
- [x] T011 [P] Implement `http-webhook.dispatcher.ts` under `backend/src/modules/lessons/infrastructure/webhook/` with 6s timeout and structured error handling.
- [x] T012 Register new repositories and dispatcher in `backend/src/modules/lessons/lessons.module.ts`.

---

## Phase 3: User Story 1 — Teacher Scheduled Slot Materialization (P1)
- [x] T013 Extend `backend/src/modules/lessons/application/teacher-lessons.use-case.ts` (`GetMyLessonsUseCase`) to query teacher's recurring schedule slots for the current/upcoming week, merging unmaterialized slots with existing lessons with `isMaterialized: false`.
- [x] T014 Create `MaterializeScheduledLessonUseCase` in `backend/src/modules/lessons/application/materialize-scheduled-lesson.use-case.ts` allowing teacher or manager to create a concrete `Lesson` + `LessonClassBinding` from a scheduled slot.
- [x] T015 Expose `POST /lesson-classes/materialize` endpoint in `lessons.controller.ts`.
- [x] T016 [P] Update `frontend/src/lib/types.ts` to add `isMaterialized` flag, `scheduleSlotId`, and slot metadata to `ProgramEntry` / `TeacherProgramEntry`.
- [x] T017 [P] Create `frontend/src/features/lessons/materialize-lesson-dialog.tsx` prefilling slot info and allowing instant creation or creation + start.
- [x] T018 Update `frontend/src/features/lessons/teacher-lessons-view.tsx` and upcoming lesson banner to show unmaterialized slots with "تثبيت الدرس" and "تثبيت وبدء".

---

## Phase 4: User Story 2 & 3 — Lesson Report Creation & Role-Based Access (P1 & P2)
- [x] T019 Create `SubmitLessonReportUseCase` in `backend/src/modules/lessons/application/submit-lesson-report.use-case.ts`:
  - Validates caller is assigned teacher or manager.
  - Creates and saves `LessonReport`.
  - Finalizes lesson via `EndLessonUseCase` logic if not already finalized.
  - Invokes `WebhookDispatcherPort` asynchronously if webhook is enabled.
- [x] T020 Create `GetLessonReportUseCase` in `backend/src/modules/lessons/application/get-lesson-report.use-case.ts`:
  - If caller is student: sanitize response by stripping `positives`, `negatives`, and `teacherNotes`.
  - If caller is teacher or manager: return entire report.
- [x] T021 Create `UpdateLessonReportUseCase` in `backend/src/modules/lessons/application/update-lesson-report.use-case.ts` allowing teachers and managers to update report fields.
- [x] T022 Expose endpoints in `lessons.controller.ts`:
  - `POST /lesson-classes/:id/report`
  - `GET /lesson-classes/:id/report`
  - `PATCH /lesson-classes/:id/report`
- [x] T023 Unit test `submit-lesson-report.use-case.spec.ts` and `get-lesson-report.use-case.spec.ts` covering role-based field redaction.
- [x] T024 Create `frontend/src/features/lessons/lesson-report-dialog.tsx`:
  - Controlled form with main ideas (required), positives, negatives.
  - Displays session notes from `LessonTimerNotes`.
- [x] T025 Update `frontend/src/features/lessons/lesson-timer-page.tsx` so clicking "إنهاء الدرس" opens `LessonReportDialog` instead of directly finishing without report.
- [x] T026 Create `frontend/src/features/lessons/lesson-report-view-dialog.tsx` displaying the submitted report with role-aware rendering.

---

## Phase 5: User Story 4 & 5 — n8n Webhook & Settings (P2 & P3)
- [x] T027 Create `RetryLessonReportWebhookUseCase` in `backend/src/modules/lessons/application/retry-lesson-report-webhook.use-case.ts` and expose `POST /lesson-classes/:id/report/retry-webhook`.
- [x] T028 Update `UpdateLessonSettingsUseCase` to handle `webhookUrl`, `webhookSecret`, and `webhookEnabled`.
- [x] T029 Update `frontend/src/features/lessons/lesson-settings-form.tsx` to include the Webhook configuration section (URL, Secret token, Enable toggle).
- [x] T030 Add "إعادة إرسال لواتساب" button on `LessonReportViewDialog` when `webhookStatus === 'failed'` with loading spinner and status feedback.

---

## Phase 6: Polish, i18n & Quality Gates
- [x] T031 Add all Arabic translations in `frontend/messages/ar.json` and English in `frontend/messages/en.json`.
- [x] T032 Verify mobile responsiveness for both report creation and report view dialogs.
- [x] T033 Verify dark and light mode rendering using semantic tokens.
- [x] T034 Run `npm run build` and `npm run test` in backend and frontend.

