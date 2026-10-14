import { LessonReport } from './lesson-report.entity';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

describe('LessonReport Entity (spec 012)', () => {
  it('creates a valid report with required main ideas', () => {
    const report = LessonReport.create({
      lessonClassId: 'binding-1',
      mainIdeas: 'حفظ سورة الكهف من آية 1 إلى 15',
      positives: 'تفاعل ممتاز',
      negatives: 'تأخر طالبين',
      teacherNotes: 'ملاحظة عامة',
      submittedBy: 'user-1',
    });

    expect(report.id).toBeDefined();
    expect(report.lessonClassId).toBe('binding-1');
    expect(report.mainIdeas).toBe('حفظ سورة الكهف من آية 1 إلى 15');
    expect(report.positives).toBe('تفاعل ممتاز');
    expect(report.negatives).toBe('تأخر طالبين');
    expect(report.teacherNotes).toBe('ملاحظة عامة');
    expect(report.webhookStatus).toBe('pending');
    expect(report.webhookError).toBeNull();
  });

  it('rejects empty or whitespace-only main ideas', () => {
    expect(() =>
      LessonReport.create({
        lessonClassId: 'binding-1',
        mainIdeas: '   ',
        submittedBy: 'user-1',
      }),
    ).toThrow(BusinessRuleError);
  });

  it('updates main ideas, positives, and negatives', () => {
    const report = LessonReport.create({
      lessonClassId: 'binding-1',
      mainIdeas: 'فكرة أولية',
      submittedBy: 'user-1',
    });

    report.update({
      mainIdeas: 'فكرة محدثة',
      positives: 'تفاعل رائع',
      negatives: null,
    });

    expect(report.mainIdeas).toBe('فكرة محدثة');
    expect(report.positives).toBe('تفاعل رائع');
    expect(report.negatives).toBeNull();
  });

  it('handles webhook status transitions', () => {
    const report = LessonReport.create({
      lessonClassId: 'binding-1',
      mainIdeas: 'فكرة',
      submittedBy: 'user-1',
    });

    report.markWebhookSent();
    expect(report.webhookStatus).toBe('sent');
    expect(report.webhookSentAt).toBeDefined();

    report.markWebhookFailed('Network timeout');
    expect(report.webhookStatus).toBe('failed');
    expect(report.webhookError).toBe('Network timeout');

    report.markWebhookPending();
    expect(report.webhookStatus).toBe('pending');
    expect(report.webhookError).toBeNull();

    report.markWebhookDisabled();
    expect(report.webhookStatus).toBe('disabled');
  });
});
