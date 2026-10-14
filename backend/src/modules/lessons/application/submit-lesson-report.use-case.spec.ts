import { SubmitLessonReportUseCase } from './submit-lesson-report.use-case';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { LessonReport } from '../domain/lesson-report.entity';
import { LessonSettings } from '../domain/lesson-settings.entity';

describe('SubmitLessonReportUseCase (spec 012)', () => {
  let useCase: SubmitLessonReportUseCase;
  let mockLessons: any;
  let mockSettingsRepo: any;
  let mockReportRepo: any;
  let mockWebhookDispatcher: any;
  let mockClasses: any;
  let mockUsers: any;

  const teacherActor: Actor = { userId: 't-1', role: UserRole.Teacher, instituteId: 'inst-1' };
  const otherTeacher: Actor = { userId: 't-2', role: UserRole.Teacher, instituteId: 'inst-1' };
  const managerActor: Actor = { userId: 'm-1', role: UserRole.InstituteManager, instituteId: 'inst-1' };

  const fakeBinding = {
    id: 'binding-1',
    lessonId: 'lesson-1',
    classId: 'class-1',
    teacherId: 't-1',
    status: 'started',
    actualStartTime: new Date(Date.now() - 45 * 60_000),
    actualEndTime: null,
    end: jest.fn().mockReturnValue(45),
    applyStatus: jest.fn(),
  };

  const fakeLesson = {
    id: 'lesson-1',
    instituteId: 'inst-1',
    name: 'تجويد النون الساكنة',
    date: '2026-10-15',
    expectedDurationMinutes: 45,
    kind: 'lesson',
    subjectId: null,
  };

  beforeEach(() => {
    mockLessons = {
      findBindingById: jest.fn().mockResolvedValue(fakeBinding),
      findLessonById: jest.fn().mockResolvedValue(fakeLesson),
      updateBindingLifecycle: jest.fn().mockResolvedValue(true),
      listSubjects: jest.fn().mockResolvedValue([]),
    };
    mockSettingsRepo = {
      findByInstitute: jest.fn().mockResolvedValue(LessonSettings.defaults('inst-1')),
    };
    mockReportRepo = {
      findByBindingId: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockWebhookDispatcher = {
      dispatchReport: jest.fn().mockResolvedValue({ success: true }),
    };
    mockClasses = {
      findById: jest.fn().mockResolvedValue({ id: 'class-1', name: 'حلقة النور' }),
    };
    mockUsers = {
      findById: jest.fn().mockResolvedValue({ id: 't-1', fullName: 'الشيخ أحمد' }),
    };

    useCase = new SubmitLessonReportUseCase(
      mockLessons,
      mockSettingsRepo,
      mockReportRepo,
      mockWebhookDispatcher,
      mockClasses,
      mockUsers,
    );
  });

  it('submits a report and ends lesson successfully', async () => {
    const result = await useCase.execute(teacherActor, 'binding-1', {
      mainIdeas: 'أحكام النون الساكنة والتنوين',
      positives: 'تفاعل ممتاز',
      negatives: 'تأخر طالبين',
    });

    expect(result.reportId).toBeDefined();
    expect(mockReportRepo.save).toHaveBeenCalled();
    expect(fakeBinding.end).toHaveBeenCalled();
    expect(mockLessons.updateBindingLifecycle).toHaveBeenCalled();
  });

  it('allows institute manager to submit report', async () => {
    const result = await useCase.execute(managerActor, 'binding-1', {
      mainIdeas: 'تم إنهاء الدرس بواسطة المدير',
    });

    expect(result.reportId).toBeDefined();
    expect(mockReportRepo.save).toHaveBeenCalled();
  });

  it('rejects submission from non-assigned teacher', async () => {
    await expect(
      useCase.execute(otherTeacher, 'binding-1', {
        mainIdeas: 'محاولة إرسال غير مصرح بها',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects duplicate report submission', async () => {
    mockReportRepo.findByBindingId.mockResolvedValueOnce({ id: 'rep-existing' });

    await expect(
      useCase.execute(teacherActor, 'binding-1', {
        mainIdeas: 'تقرير مكرر',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('records failed webhook status when dispatcher fails without throwing', async () => {
    const settingsWithWebhook = LessonSettings.defaults('inst-1');
    settingsWithWebhook.update({
      webhookUrl: 'https://n8n.example.com/webhook',
      webhookEnabled: true,
    });
    mockSettingsRepo.findByInstitute.mockResolvedValueOnce(settingsWithWebhook);
    mockWebhookDispatcher.dispatchReport.mockResolvedValueOnce({
      success: false,
      error: 'Connection timed out',
    });

    const result = await useCase.execute(teacherActor, 'binding-1', {
      mainIdeas: 'تقرير تجربة فشل الويب هوك',
    });

    expect(result.webhookStatus).toBe('failed');
    expect(mockReportRepo.save).toHaveBeenCalled();
  });
});
