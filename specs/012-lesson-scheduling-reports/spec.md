# Feature Specification: Scheduled Lessons Materialization & Lesson Reports with n8n Webhook

**Feature Branch**: `012-lesson-scheduling-reports`  
**Created**: 2026-10-13  
**Status**: Draft  
**Input**: Teacher workflow for weekly schedule unmaterialized lessons (viewing in "دروسي", quick access, and weekly plan, pre-materializing or on-the-spot materializing), mandatory lesson report on lesson completion (main ideas, positives, negatives, incorporating teacher lesson notes), role-based report visibility (full for teachers/managers; filtered for students/parents), and automated n8n WhatsApp Webhook dispatch per class with retry capability.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Teacher views scheduled template slots and materializes them (Priority: P1)

Currently, recurring slots from `class_schedule` only exist as virtual template slots in the weekly plan. A teacher assigned to a weekly slot must be able to see their upcoming scheduled lessons directly in their "دروسي" (My Lessons) view, in their Quick Access ("الحصة القادمة"), and in the weekly plan, even before the lesson is instantiated.

The teacher (or manager) can pre-materialize the lesson at any time (e.g. days in advance) by filling in lesson details (name, subject, category, expected duration, description, sources), or materialize it on-the-spot when the session begins, transitioning it immediately into an active lesson timer session.

**Why this priority**: Without materializing the scheduled template slot into a concrete `Lesson` and `LessonClassBinding`, the teacher cannot start the lesson timer or write the final report.

**Independent Test**:
A teacher with a weekly slot on Tuesday logs into `/dashboard/my-lessons` on Monday. They see the Tuesday slot marked as "غير مثبت" (Unmaterialized / Scheduled Template). They click "تثبيت الدرس" (Materialize Lesson), enter the lesson title "تجويد أحكام النون الساكنة" and duration 45 minutes, and save. The slot immediately transforms into a concrete scheduled lesson with a "بدء الدرس" button ready for Tuesday.

**Acceptance Scenarios**:
1. **Given** a recurring schedule slot exists for teacher T on class C, **When** teacher T opens `/dashboard/my-lessons`, **Then** the upcoming slot appears in the teacher's lesson list and upcoming banner with a distinct badge indicating it is a scheduled template awaiting materialization.
2. **Given** an unmaterialized scheduled slot, **When** the assigned teacher (or institute manager) clicks "تثبيت الدرس", **Then** a dialog appears pre-populated with slot defaults (class, track, teacher, subject, category, expected duration).
3. **Given** valid details are entered, **When** submitted, **Then** a new `Lesson` and `LessonClassBinding` are persisted, linked to the schedule slot, and available for starting.
4. **Given** it is the day of the lesson and the slot is still unmaterialized, **When** the teacher clicks "بدء الدرس مباشرة", **Then** the materialization dialog prompts for the lesson title/details and, upon submission, immediately creates the binding and starts the live timer.

---

### User Story 2 — Teacher completes lesson and submits structured Lesson Report (Priority: P1)

When the teacher presses "End lesson" (إنهاء الدرس) in the live timer page, instead of instantly dropping back to the lessons list, the teacher is presented with the Lesson Report modal.

The report captures:
- **المحاور والأفكار الأساسية** (Main ideas & covered topics - mandatory)
- **الإيجابيات** (Positives & strengths - optional/recommended)
- **السلبيات / التحديات** (Negatives & challenges - optional/recommended)
- Any teacher notes recorded during the lesson session (from `LessonTimerNotes`) are automatically incorporated or associated with this report.

Submitting the report finalizes the lesson delivery status (`finished`, `over_time`, `under_time`) and triggers the automated Webhook dispatch.

**Why this priority**: Core educational quality assurance and teacher accountability requested by the institute.

**Independent Test**:
In an ongoing lesson, the teacher clicks "إنهاء الدرس". The timer stops and a report submission dialog opens. The teacher writes "حفظ سورة الكهف من آية 1 إلى 15" in Main Ideas, "تفاعل ممتاز من جميع الطلاب" in Positives, and "تأخر طالبين عن الموعد" in Negatives. The teacher clicks "اعتماد التقرير وإنهاء الدرس". The lesson status updates, the report is saved, and a success confirmation is displayed.

**Acceptance Scenarios**:
1. **Given** an active lesson session in `started` state, **When** the teacher clicks "إنهاء الدرس", **Then** the timer pauses/stops and the "تقرير الدرس" form opens.
2. **Given** the report form is displayed, **When** the teacher enters the required main ideas and presses submit, **Then** a `LessonReport` record is created, linked to the `lesson_classes` binding, and the lesson transitions to finished status.
3. **Given** teacher notes were logged during the session, **When** the report form opens, **Then** those notes are visible/prefilled so the teacher does not lose their session observations.
4. **Given** a lesson report has been saved, **When** the assigned teacher or the institute manager opens the lesson report later, **Then** both can edit the report content (main ideas, positives, negatives).

---

### User Story 3 — Role-Based Lesson Report Visibility (Priority: P2)

The system enforces strict access control on lesson reports:
- **Teachers & Institute Managers**: Can view the full report including general info, main ideas, positives, negatives, and internal teacher notes.
- **Students & Parents**: Can view general lesson info and main ideas (المعلومات العامة والمحاور الأساسية), but **MUST NOT** see positives, negatives, or internal teacher notes.

**Why this priority**: Preserves educational privacy and prevents student/parent friction regarding internal notes or critical feedback while keeping parents informed about curriculum progress.

**Independent Test**:
1. Log in as teacher or manager: view lesson report → see title, duration, main ideas, positives, and negatives.
2. Log in as student: view lesson report → see title, duration, and main ideas only; positives, negatives, and notes sections are completely hidden on both API response and UI.

**Acceptance Scenarios**:
1. **Given** an authenticated student requests a lesson report, **When** the API responds, **Then** fields for `positives`, `negatives`, and `internalNotes` are stripped server-side.
2. **Given** an authenticated teacher (assigned to the lesson) or institute manager, **When** viewing the report, **Then** all sections (general info, main ideas, positives, negatives, notes) are displayed.

---

### User Story 4 — n8n WhatsApp Webhook Dispatch & Delivery Retry (Priority: P2)

When a lesson report is submitted or updated, the system triggers an HTTP POST Webhook to an external n8n endpoint configured for the institute.

The n8n webhook payload contains structured details per class (حلقة) formatted for WhatsApp notification:
- Class name & institute
- Lesson title, subject, and date
- Actual duration vs expected duration
- Teacher full name
- Main ideas (المحاور والأفكار الأساسية)
- Filtered payload flag for parent communication (strictly omitting internal positives/negatives/notes from parent-facing messages)

If the webhook fails (timeout, network error, n8n unreachable):
- The report is still saved successfully.
- Webhook status is set to `failed` with the error reason recorded.
- An "إعادة الإرسال" (Retry) button is available on the report view for teachers/managers to re-trigger the webhook.

**Why this priority**: Automated parent and administration notification via WhatsApp via n8n.

**Independent Test**:
Configure an n8n webhook URL. Submit a report. Verify that n8n receives the POST request with the expected JSON payload. Simulate webhook timeout: verify the report saves, shows a "فشل الإرسال إلى واتساب" badge, and clicking "إعادة الإرسال" successfully dispatches the payload.

**Acceptance Scenarios**:
1. **Given** an institute with an active Webhook URL configured in lesson settings, **When** a report is submitted, **Then** an HTTP POST is dispatched with JSON payload containing lesson & report metadata.
2. **Given** the webhook server responds with 2xx, **When** processed, **Then** the report's `webhookStatus` is marked `sent` with `webhookSentAt` recorded.
3. **Given** the webhook request times out or returns an error, **When** processed, **Then** `webhookStatus` is set to `failed` and the error message is recorded without rolling back the lesson report.
4. **Given** a report with `webhookStatus = 'failed'`, **When** a teacher or manager clicks "إعادة إرسال لواتساب", **Then** the webhook is dispatched again and status updates to `sent` upon success.

---

### User Story 5 — Institute Webhook Configuration in Lesson Settings (Priority: P3)

The institute manager can configure the n8n WhatsApp webhook endpoint in `/dashboard/lessons/settings`:
- Webhook URL (e.g. `https://n8n.example.com/webhook/lesson-report`)
- Optional Webhook Secret / Header Token for security verification
- Toggle to enable/disable automated WhatsApp webhook notifications

**Why this priority**: Required for multi-tenant flexibility; each institute can configure its own n8n webhook or disable the feature.

**Independent Test**:
Manager opens `/dashboard/lessons/settings`, enters the webhook URL and token, enables the toggle, and clicks Save. The settings persist and are used for all subsequent lesson report submissions for that institute.

**Acceptance Scenarios**:
1. **Given** an institute manager opens lesson settings, **When** they enter a valid URL in the Webhook field and save, **Then** it is stored in `lesson_settings`.
2. **Given** webhook toggle is disabled, **When** a teacher ends a lesson and submits a report, **Then** no external HTTP call is attempted and status is set to `disabled`.

---

## Edge Cases

- **Teacher starts lesson past its scheduled day**: Permitted if within the grace window, but if skipped completely, lazy `not_given` applies.
- **Multiple classes sharing one lesson definition**: Each class binding has its own delivery lifecycle and its own `LessonReport` + distinct webhook dispatch per class.
- **Network drops right when submitting report**: The form retains written inputs in local state to prevent losing written positives/negatives upon reconnect.
- **Concurrent edits on report**: Optimistic concurrency or last-write-wins with updated timestamp and editor user ID.
- **Webhook endpoint slow**: Dispatch must be asynchronous (or background job / short timeout ~5s) so the user's report submission UI is never frozen.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST return unmaterialized weekly schedule slots in `GetMyLessonsUseCase` and teacher weekly views, flagged as `isMaterialized: false`.
- **FR-002**: Teachers MUST be able to materialize an unmaterialized weekly slot assigned to them by providing lesson name, category, and details, creating a persisted `Lesson` and `LessonClassBinding`.
- **FR-003**: System MUST allow instant materialization and start ("تثبيت وبدء") directly on the day of the lesson.
- **FR-004**: System MUST present a mandatory Lesson Report dialog upon pressing "End lesson" in the timer view.
- **FR-005**: The Lesson Report MUST persist:
  - `mainIdeas` (text, required)
  - `positives` (text, optional)
  - `negatives` (text, optional)
  - `teacherNotes` (text, optional, aggregated from session notes)
  - `submittedBy` (user UUID)
  - `webhookStatus` (`pending` | `sent` | `failed` | `disabled`)
  - `webhookError` (text, nullable)
  - `webhookSentAt` (timestamp, nullable)
- **FR-006**: Both assigned teachers and institute managers MUST be allowed to edit existing lesson reports.
- **FR-007**: When accessed by students or parents, the API MUST sanitize the report to include ONLY general lesson details and `mainIdeas`, stripping `positives`, `negatives`, and `teacherNotes`.
- **FR-008**: System MUST trigger an HTTP POST webhook to the institute's configured n8n URL upon report submission or retry.
- **FR-009**: The webhook payload MUST include full lesson context: `instituteId`, `classId`, `className`, `teacherName`, `lessonTitle`, `date`, `durationMinutes`, `mainIdeas`, and formatted text for WhatsApp messaging.
- **FR-010**: System MUST provide an "إعادة الإرسال" (Retry) action for failed webhooks.
- **FR-011**: System MUST store Webhook URL, Webhook Secret, and enabled flag inside `lesson_settings` per institute.

---

### Key Entities

- **`LessonReport`**: Aggregate root representing the post-lesson feedback. Linked 1-to-1 with `lesson_classes`.
- **`LessonSettings`**: Extended with `webhookUrl`, `webhookSecret`, and `webhookEnabled`.
- **`TeacherScheduledSlotView`**: Unified read model merging concrete `lesson_classes` and unmaterialized `class_schedule` template slots for the teacher.

---

## Success Criteria *(mandatory)*

- **SC-001**: Teachers can view and materialize scheduled slots in under 3 clicks from their dashboard.
- **SC-002**: Lesson report submission takes under 1.5 seconds from form submission to confirmation.
- **SC-003**: 100% of student/parent API requests strictly omit internal notes, positives, and negatives.
- **SC-004**: Webhook failure does not prevent report saving; 100% of failed webhooks can be retried via a single click.
- **SC-005**: Full bilingual support (Arabic RTL / English LTR) and dark/light mode compliance across all new UI views.
