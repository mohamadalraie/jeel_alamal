# Data Model: Scheduled Lessons Materialization & Lesson Reports

## 1. Drizzle Schemas

### `lesson_reports` Table
```typescript
export const lessonReportWebhookStatusEnum = pgEnum('lesson_report_webhook_status', [
  'pending',
  'sent',
  'failed',
  'disabled',
]);

export const lessonReports = pgTable('lesson_reports', {
  id: uuid('id').primaryKey(),
  lessonClassId: uuid('lesson_class_id')
    .notNull()
    .unique()
    .references(() => lessonClasses.id, { onDelete: 'cascade' }),
  mainIdeas: text('main_ideas').notNull(),
  positives: text('positives'),
  negatives: text('negatives'),
  teacherNotes: text('teacher_notes'),
  submittedBy: uuid('submitted_by')
    .notNull()
    .references(() => users.id),
  webhookStatus: lessonReportWebhookStatusEnum('webhook_status')
    .notNull()
    .default('pending'),
  webhookError: text('webhook_error'),
  webhookSentAt: timestamp('webhook_sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

### `lesson_settings` Table Extensions
```typescript
// Added to existing lesson_settings table:
webhookUrl: varchar('webhook_url', { length: 500 }),
webhookSecret: varchar('webhook_secret', { length: 255 }),
webhookEnabled: boolean('webhook_enabled').notNull().default(false),
```

---

## 2. Domain Entities

### `LessonReport`
```typescript
export interface LessonReportProps {
  lessonClassId: string;
  mainIdeas: string;
  positives: string | null;
  negatives: string | null;
  teacherNotes: string | null;
  submittedBy: string;
  webhookStatus: 'pending' | 'sent' | 'failed' | 'disabled';
  webhookError: string | null;
  webhookSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Webhook Payload Contract (Dispatched to n8n)

```json
{
  "event": "lesson.report.completed",
  "instituteId": "uuid",
  "classId": "uuid",
  "className": "حلقة النور",
  "lessonClassId": "uuid",
  "lessonId": "uuid",
  "lessonTitle": "تجويد أحكام النون الساكنة",
  "subjectName": "القرآن والتجويد",
  "date": "2026-10-15",
  "actualStartTime": "2026-10-15T16:00:00Z",
  "actualEndTime": "2026-10-15T16:45:00Z",
  "actualDurationMinutes": 45,
  "expectedDurationMinutes": 45,
  "teacher": {
    "id": "uuid",
    "name": "الشيخ أحمد المحمد"
  },
  "report": {
    "mainIdeas": "أحكام النون الساكنة والتنوين: الإظهار الحلقي وحروفه الستة مع التطبيق العملي",
    "parentMessageFormatted": "السلام عليكم ورحمة الله وبركاته.\nتقرير درس اليوم لحلقة النور:\n- المادة: القرآن والتجويد\n- الدرس: تجويد أحكام النون الساكنة\n- الأستاذ: الشيخ أحمد المحمد\n- المحاور: أحكام النون الساكنة والتنوين: الإظهار الحلقي وحروفه الستة مع التطبيق العملي.\nنسأل الله لأبنائنا دوام التوفيق والنجاح."
  }
}
```
*(Notice: internal positives, negatives, and private teacher notes are strictly excluded from the parent WhatsApp message block to maintain strict privacy).*
