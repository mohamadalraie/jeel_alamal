import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import type { FinalLessonStatus } from './lesson-binding-status';

export const DEFAULT_DURATION_THRESHOLD_MINUTES = 10;
export const MAX_DURATION_THRESHOLD_MINUTES = 120;

interface LessonSettingsProps {
  instituteId: string;
  durationThresholdMinutes: number;
  durationStatusEnabled: boolean;
  webhookUrl: string | null;
  webhookSecret: string | null;
  webhookEnabled: boolean;
  updatedAt: Date;
}

/**
 * Per-institute lesson settings (spec 009 & 012). Governs how a finished lesson's
 * actual duration is compared against its expected duration, plus n8n Webhook
 * settings for WhatsApp integration.
 */
export class LessonSettings extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: LessonSettingsProps,
  ) {
    super(id);
  }

  /** In-memory defaults for an institute with no saved record yet. */
  static defaults(instituteId: string): LessonSettings {
    return new LessonSettings(instituteId, {
      instituteId,
      durationThresholdMinutes: DEFAULT_DURATION_THRESHOLD_MINUTES,
      durationStatusEnabled: true,
      webhookUrl: null,
      webhookSecret: null,
      webhookEnabled: false,
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    instituteId: string,
    props: LessonSettingsProps,
  ): LessonSettings {
    return new LessonSettings(instituteId, props);
  }

  update(input: {
    durationThresholdMinutes?: number;
    durationStatusEnabled?: boolean;
    webhookUrl?: string | null;
    webhookSecret?: string | null;
    webhookEnabled?: boolean;
  }): void {
    if (input.durationThresholdMinutes !== undefined) {
      if (
        !Number.isInteger(input.durationThresholdMinutes) ||
        input.durationThresholdMinutes < 0 ||
        input.durationThresholdMinutes > MAX_DURATION_THRESHOLD_MINUTES
      ) {
        throw new BusinessRuleError(
          `Threshold must be a whole number between 0 and ${MAX_DURATION_THRESHOLD_MINUTES} minutes`,
        );
      }
      this.props.durationThresholdMinutes = input.durationThresholdMinutes;
    }

    if (input.durationStatusEnabled !== undefined) {
      this.props.durationStatusEnabled = input.durationStatusEnabled;
    }

    if (input.webhookUrl !== undefined) {
      const url = input.webhookUrl?.trim() || null;
      if (url && !/^https?:\/\//i.test(url)) {
        throw new BusinessRuleError('Webhook URL must begin with http:// or https://');
      }
      this.props.webhookUrl = url;
    }

    if (input.webhookSecret !== undefined) {
      this.props.webhookSecret = input.webhookSecret?.trim() || null;
    }

    if (input.webhookEnabled !== undefined) {
      this.props.webhookEnabled = input.webhookEnabled;
    }

    this.props.updatedAt = new Date();
  }

  /**
   * Decide the terminal status of a finished lesson (FR-016/FR-017).
   * When evaluation is disabled, the threshold is 0, or no expected duration
   * was set, every lesson simply resolves to `finished`. The boundary is
   * inclusive: exactly `expected ± threshold` is still `finished`.
   */
  evaluate(
    actualMinutes: number,
    expectedMinutes: number | null,
  ): FinalLessonStatus {
    if (
      !this.props.durationStatusEnabled ||
      this.props.durationThresholdMinutes <= 0 ||
      expectedMinutes === null
    ) {
      return 'finished';
    }
    const threshold = this.props.durationThresholdMinutes;
    if (actualMinutes > expectedMinutes + threshold) return 'over_time';
    if (actualMinutes < expectedMinutes - threshold) return 'under_time';
    return 'finished';
  }

  get instituteId() {
    return this.props.instituteId;
  }
  get durationThresholdMinutes() {
    return this.props.durationThresholdMinutes;
  }
  get durationStatusEnabled() {
    return this.props.durationStatusEnabled;
  }
  get webhookUrl() {
    return this.props.webhookUrl;
  }
  get webhookSecret() {
    return this.props.webhookSecret;
  }
  get webhookEnabled() {
    return this.props.webhookEnabled;
  }
  get updatedAt() {
    return this.props.updatedAt;
  }
}
