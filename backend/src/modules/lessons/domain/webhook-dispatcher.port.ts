export interface LessonReportWebhookPayload {
  event: 'lesson.report.completed';
  instituteId: string;
  classId: string;
  className: string;
  lessonClassId: string;
  lessonId: string;
  lessonTitle: string;
  subjectName: string | null;
  date: string;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  actualDurationMinutes: number | null;
  expectedDurationMinutes: number | null;
  teacher: {
    id: string;
    name: string | null;
  };
  report: {
    mainIdeas: string;
    parentMessageFormatted: string;
  };
}

export const WEBHOOK_DISPATCHER = Symbol('WEBHOOK_DISPATCHER');

export interface WebhookDispatchResult {
  success: boolean;
  error?: string;
}

export interface WebhookDispatcherPort {
  dispatchReport(
    payload: LessonReportWebhookPayload,
    url: string,
    secret?: string | null,
  ): Promise<WebhookDispatchResult>;
}
