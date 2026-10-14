import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import { LESSON_REPOSITORY, type LessonRepository } from '../domain/lesson.repository';
import {
  LESSON_SETTINGS_REPOSITORY,
  type LessonSettingsRepository,
} from '../domain/lesson-settings.repository';
import {
  LESSON_REPORT_REPOSITORY,
  type LessonReportRepository,
} from '../domain/lesson-report.repository';
import {
  WEBHOOK_DISPATCHER,
  type WebhookDispatcherPort,
  type LessonReportWebhookPayload,
} from '../domain/webhook-dispatcher.port';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/user.repository';
import { formatParentMessage } from './submit-lesson-report.use-case';

@Injectable()
export class RetryLessonReportWebhookUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
    @Inject(LESSON_SETTINGS_REPOSITORY)
    private readonly settingsRepo: LessonSettingsRepository,
    @Inject(LESSON_REPORT_REPOSITORY)
    private readonly reportRepo: LessonReportRepository,
    @Inject(WEBHOOK_DISPATCHER)
    private readonly webhookDispatcher: WebhookDispatcherPort,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    lessonClassId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const report = await this.reportRepo.findByBindingId(lessonClassId);
    if (!report) throw new NotFoundError('Lesson report not found');

    const binding = await this.lessons.findBindingById(lessonClassId);
    if (!binding) throw new NotFoundError('Lesson assignment not found');

    const isManager =
      actor.role === UserRole.InstituteManager ||
      actor.role === UserRole.SuperAdmin;
    const isAssignedTeacher = binding.teacherId === actor.userId;

    if (!isManager && !isAssignedTeacher) {
      throw new ForbiddenError(
        'Only the assigned teacher or manager can retry webhook dispatch',
      );
    }

    const lesson = await this.lessons.findLessonById(binding.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const settings = await this.settingsRepo.findByInstitute(lesson.instituteId);
    if (!settings || !settings.webhookEnabled || !settings.webhookUrl) {
      throw new BusinessRuleError('Webhook is not enabled for this institute');
    }

    const [klass, teacherUser, subjects] = await Promise.all([
      this.classes.findById(binding.classId),
      this.users.findById(binding.teacherId),
      lesson.subjectId
        ? this.lessons.listSubjects(lesson.instituteId, false)
        : Promise.resolve([]),
    ]);

    const subjectName = lesson.subjectId
      ? subjects.find((s) => s.id === lesson.subjectId)?.name ?? null
      : null;

    const className = klass?.name ?? 'الحلقة';
    const lessonTitle =
      lesson.kind === 'recitation'
        ? 'تسميع وتلاوة القرآن الكريم'
        : (lesson.name ?? 'درس');
    const teacherName = teacherUser?.fullName ?? null;

    let actualDurationMinutes: number | null = null;
    if (binding.actualStartTime && binding.actualEndTime) {
      const ms = binding.actualEndTime.getTime() - binding.actualStartTime.getTime();
      actualDurationMinutes = Math.max(1, Math.ceil(ms / 60_000));
    }

    const parentMessage = formatParentMessage({
      className,
      lessonTitle,
      subjectName,
      teacherName,
      date: lesson.date,
      mainIdeas: report.mainIdeas,
    });

    const payload: LessonReportWebhookPayload = {
      event: 'lesson.report.completed',
      instituteId: lesson.instituteId,
      classId: binding.classId,
      className,
      lessonClassId: binding.id,
      lessonId: lesson.id,
      lessonTitle,
      subjectName,
      date: lesson.date,
      actualStartTime: binding.actualStartTime,
      actualEndTime: binding.actualEndTime,
      actualDurationMinutes,
      expectedDurationMinutes: lesson.expectedDurationMinutes,
      teacher: {
        id: binding.teacherId,
        name: teacherName,
      },
      report: {
        mainIdeas: report.mainIdeas,
        parentMessageFormatted: parentMessage,
      },
    };

    const result = await this.webhookDispatcher.dispatchReport(
      payload,
      settings.webhookUrl,
      settings.webhookSecret,
    );

    if (result.success) {
      report.markWebhookSent();
    } else {
      report.markWebhookFailed(result.error ?? 'Webhook delivery failed');
    }

    await this.reportRepo.update(report);

    return result;
  }
}
