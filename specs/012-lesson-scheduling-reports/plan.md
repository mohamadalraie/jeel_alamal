# Implementation Plan: Scheduled Lessons Materialization & Lesson Reports with n8n Webhook

**Branch**: `012-lesson-scheduling-reports` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)

## Summary

Enhance the weekly schedule & lesson delivery lifecycle with three interconnected capabilities:
1. **Teacher Slot Materialization**: Unmaterialized recurring schedule slots (`class_schedule`) are surfaced in the teacher's "دروسي" view, quick access, and weekly plan. The teacher or manager can pre-materialize or instantly materialize & start them.
2. **Post-Lesson Reporting**: Upon clicking "إنهاء الدرس", a mandatory Lesson Report dialog captures main ideas (required), positives, negatives, and session notes. Clean role-based authorization ensures students/parents only see general info + main ideas, while teachers and managers see the entire report.
3. **n8n WhatsApp Webhook Integration**: When a report is submitted, an asynchronous webhook dispatches the report payload to an institute-configured n8n webhook URL. Failures are captured gracefully with a 1-click retry mechanism.

---

## Technical Context

**Language/Version**: TypeScript 5, Node 24  
**Primary Dependencies**: NestJS (backend), Next.js App Router (frontend), Drizzle ORM, TanStack Query v5, shadcn/ui, next-intl  
**Storage**: PostgreSQL via Drizzle — new migration `0005` (creates `lesson_reports` table, adds webhook columns to `lesson_settings`)  
**Testing**: Jest (use-case unit tests with in-memory fakes)  
**Target Platform**: Docker Compose, mobile-first responsive web  
**Constraints**: Multi-tenancy isolation (`institute_id` enforced server-side), Clean Architecture 4-layer rule, semantic color tokens only, bilingual (`ar` RTL / `en` LTR), light + dark modes.  

---

## Constitution Check

| Gate | Status | Notes |
|---|---|---|
| I. Clean Architecture — 4 layers | ✅ | Domain entities/ports in `domain/`; use-cases in `application/`; Drizzle & HTTP dispatcher in `infrastructure/`; controllers in `presentation/`. |
| II. Multi-tenancy — scoped by institute | ✅ | All queries/mutations scoped to actor's institute. `LessonReport` inherits scope from `lesson_classes` → `lessons.institute_id`. |
| III. RBAC — deny by default | ✅ | Only assigned teacher or manager can materialize, start, write, edit, or retry report; students only read sanitized view. |
| IV. JWT cookies & Server-side auth | ✅ | Actor resolved from JWT cookie, permissions verified in use-cases. |
| V. Component reuse | ✅ | Reuses `Dialog`, `Button`, `FormField`, `Card`, `Badge` from `src/components/ui/`. No duplicate primitives. |
| VI. Semantic tokens & Theming | ✅ | `bg-primary`, `text-muted-foreground`, `status-*` variables; verified in both dark and light modes. |
| VII. Bilingual (ar RTL / en LTR) & Mobile-first | ✅ | All strings in `messages/ar.json` and `messages/en.json`. Single-column mobile modals. |
| VIII. Schema via Drizzle migrations | ✅ | `npm run db:generate` → review SQL → commit → `npm run migration:run`. |

---

## Project Structure

### Documentation
```text
specs/012-lesson-scheduling-reports/
├── spec.md              # Feature specification & user scenarios
├── plan.md              # Implementation plan (this document)
├── data-model.md        # Database schemas & relationships
└── tasks.md             # Task breakdown by phase and priority
```

### Source Code Changes

```text
backend/src/modules/lessons/
├── domain/
│   ├── lesson-report.entity.ts               NEW — LessonReport aggregate root
│   ├── lesson-report.repository.ts           NEW — Port for lesson reports
│   ├── webhook-dispatcher.port.ts            NEW — Port for dispatching external webhooks
│   ├── lesson-settings.entity.ts             EDIT — Add webhookUrl, webhookSecret, webhookEnabled
│   └── lesson.repository.ts                  EDIT — Add query for teacher unmaterialized slots
├── application/
│   ├── dto/
│   │   ├── lesson-report.dto.ts              NEW — CreateReportDto, UpdateReportDto, ReportViewDto
│   │   └── lesson.dto.ts                     EDIT — Extend TeacherProgramEntry with isMaterialized flag
│   ├── materialize-scheduled-lesson.use-case.ts NEW — Turn a weekly schedule slot into concrete lesson
│   ├── submit-lesson-report.use-case.ts      NEW — Create report, finalize lesson, trigger webhook
│   ├── get-lesson-report.use-case.ts         NEW — Fetch report with role-based field sanitization
│   ├── update-lesson-report.use-case.ts      NEW — Edit existing report (teacher/manager)
│   ├── retry-lesson-report-webhook.use-case.ts NEW — Retry failed webhook
│   ├── teacher-lessons.use-case.ts           EDIT — Merge unmaterialized upcoming weekly slots
│   └── lesson-settings.use-cases.ts          EDIT — Handle webhook configuration updates
├── infrastructure/
│   ├── persistence/
│   │   ├── lesson-report.schema.ts           NEW — Drizzle table for lesson_reports
│   │   ├── drizzle-lesson-report.repository.ts NEW — Implementation of LessonReportRepository
│   │   ├── lesson.schema.ts                  EDIT — Add webhook fields to lessonSettings
│   │   └── drizzle-lesson.repository.ts      EDIT — Unmaterialized slot queries & joins
│   └── webhook/
│       └── axios-webhook.dispatcher.ts       NEW — Resilient HTTP POST dispatcher
└── presentation/
    └── lessons.controller.ts                 EDIT — Add report & materialization endpoints

frontend/src/
├── lib/
│   ├── types.ts                              EDIT — Add LessonReport, extend TeacherProgramEntry, LessonSettings
│   ├── api.ts                                EDIT — Add API functions for reports, materialization, retry
│   └── queries.ts                            EDIT — Add query keys and hooks for lesson reports
├── features/lessons/
│   ├── teacher-lessons-view.tsx              EDIT — Render unmaterialized slots with "تثبيت" / "بدء" actions
│   ├── lesson-timer-page.tsx                 EDIT — Trigger LessonReportDialog on "إنهاء الدرس"
│   ├── lesson-report-dialog.tsx              NEW — Form for writing lesson report (main ideas, positives, negatives)
│   ├── lesson-report-view-dialog.tsx         NEW — Full & sanitized viewer for lesson report
│   ├── materialize-lesson-dialog.tsx         NEW — Modal to fill in slot details and instantiate lesson
│   └── lesson-settings-form.tsx              EDIT — Add Webhook configuration section in settings
└── messages/
    ├── ar.json                               EDIT — Arabic translations for report, webhook, and materialization
    └── en.json                               EDIT — English translations
```
