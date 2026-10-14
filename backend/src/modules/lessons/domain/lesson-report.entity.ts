import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

export type LessonReportWebhookStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'disabled';

export interface LessonReportProps {
  lessonClassId: string;
  mainIdeas: string;
  positives: string | null;
  negatives: string | null;
  teacherNotes: string | null;
  submittedBy: string;
  webhookStatus: LessonReportWebhookStatus;
  webhookError: string | null;
  webhookSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LessonReport extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: LessonReportProps,
  ) {
    super(id);
  }

  static create(input: {
    lessonClassId: string;
    mainIdeas: string;
    positives?: string | null;
    negatives?: string | null;
    teacherNotes?: string | null;
    submittedBy: string;
    webhookStatus?: LessonReportWebhookStatus;
  }): LessonReport {
    const trimmedIdeas = input.mainIdeas?.trim();
    if (!trimmedIdeas) {
      throw new BusinessRuleError('Main ideas (المحاور والأفكار الأساسية) are required');
    }

    const now = new Date();
    return new LessonReport(randomUUID(), {
      lessonClassId: input.lessonClassId,
      mainIdeas: trimmedIdeas,
      positives: input.positives?.trim() || null,
      negatives: input.negatives?.trim() || null,
      teacherNotes: input.teacherNotes?.trim() || null,
      submittedBy: input.submittedBy,
      webhookStatus: input.webhookStatus ?? 'pending',
      webhookError: null,
      webhookSentAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(id: string, props: LessonReportProps): LessonReport {
    return new LessonReport(id, props);
  }

  update(input: {
    mainIdeas?: string;
    positives?: string | null;
    negatives?: string | null;
  }): void {
    if (input.mainIdeas !== undefined) {
      const trimmed = input.mainIdeas.trim();
      if (!trimmed) {
        throw new BusinessRuleError('Main ideas cannot be empty');
      }
      this.props.mainIdeas = trimmed;
    }
    if (input.positives !== undefined) {
      this.props.positives = input.positives?.trim() || null;
    }
    if (input.negatives !== undefined) {
      this.props.negatives = input.negatives?.trim() || null;
    }
    this.props.updatedAt = new Date();
  }

  markWebhookSent(now: Date = new Date()): void {
    this.props.webhookStatus = 'sent';
    this.props.webhookError = null;
    this.props.webhookSentAt = now;
    this.props.updatedAt = now;
  }

  markWebhookFailed(error: string): void {
    this.props.webhookStatus = 'failed';
    this.props.webhookError = error.slice(0, 500);
    this.props.updatedAt = new Date();
  }

  markWebhookPending(): void {
    this.props.webhookStatus = 'pending';
    this.props.webhookError = null;
    this.props.updatedAt = new Date();
  }

  markWebhookDisabled(): void {
    this.props.webhookStatus = 'disabled';
    this.props.webhookError = null;
    this.props.updatedAt = new Date();
  }

  get lessonClassId() {
    return this.props.lessonClassId;
  }
  get mainIdeas() {
    return this.props.mainIdeas;
  }
  get positives() {
    return this.props.positives;
  }
  get negatives() {
    return this.props.negatives;
  }
  get teacherNotes() {
    return this.props.teacherNotes;
  }
  get submittedBy() {
    return this.props.submittedBy;
  }
  get webhookStatus() {
    return this.props.webhookStatus;
  }
  get webhookError() {
    return this.props.webhookError;
  }
  get webhookSentAt() {
    return this.props.webhookSentAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
