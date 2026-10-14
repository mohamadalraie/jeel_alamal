import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
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
import { LessonSettings } from '../domain/lesson-settings.entity';
import { LessonReport } from '../domain/lesson-report.entity';
import { SubmitLessonReportDto } from './dto/lesson-report.dto';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/user.repository';

export function formatParentMessage(input: {
  className: string;
  lessonTitle: string;
  subjectName?: string | null;
  teacherName?: string | null;
  date: string;
  mainIdeas: string;
}): string {
  const lines = [
    `السلام عليكم ورحمة الله وبركاته.`,
    `📌 تقرير درس اليوم - ${input.className}`,
    `📅 التاريخ: ${input.date}`,
  ];
  if (input.subjectName) {
    lines.push(`📖 المادة: ${input.subjectName}`);
  }
  lines.push(`📝 عنوان الدرس: ${input.lessonTitle}`);
  if (input.teacherName) {
    lines.push(`👤 الأستاذ: ${input.teacherName}`);
  }
  lines.push(`\n🎯 المحاور والأفكار الأساسية:\n${input.mainIdeas}`);
  lines.push(`\nنسأل الله لأبنائنا دوام التوفيق والنجاح. ✨`);
  return lines.join('\n');
}

@Injectable()
export class SubmitLessonReportUseCase {
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
    dto: SubmitLessonReportDto,
  ): Promise<{ reportId: string; webhookStatus: string }> {
    const binding = await this.lessons.findBindingById(lessonClassId);
    if (!binding) throw new NotFoundError('Lesson assignment not found');

    const isManager =
      actor.role === 'institute_manager' || actor.role === 'super_admin';
    if (binding.teacherId !== actor.userId && !isManager) {
      throw new ForbiddenError(
        'Only the assigned teacher or manager can submit a report for this lesson',
      );
    }

    const existing = await this.reportRepo.findByBindingId(lessonClassId);
    if (existing) {
      throw new ConflictError('A report for this lesson has already been submitted');
    }

    const lesson = await this.lessons.findLessonById(binding.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const settings =
      (await this.settingsRepo.findByInstitute(lesson.instituteId)) ??
      LessonSettings.defaults(lesson.instituteId);

    // If lesson was in started status, finalize it now
    let actualDurationMinutes: number | null = null;
    if (binding.status === 'started') {
      actualDurationMinutes = binding.end(new Date());
      const status = settings.evaluate(
        actualDurationMinutes,
        lesson.expectedDurationMinutes,
      );
      binding.applyStatus(status);
      await this.lessons.updateBindingLifecycle(binding, 'started');
    } else if (binding.actualStartTime && binding.actualEndTime) {
      const ms = binding.actualEndTime.getTime() - binding.actualStartTime.getTime();
      actualDurationMinutes = Math.max(1, Math.ceil(ms / 60_000));
    }

    // Create Report entity
    const report = LessonReport.create({
      lessonClassId,
      mainIdeas: dto.mainIdeas,
      positives: dto.positives,
      negatives: dto.negatives,
      teacherNotes: dto.teacherNotes,
      submittedBy: actor.userId,
    });

    // Handle Webhook dispatch
    if (settings.webhookEnabled && settings.webhookUrl) {
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
      const lessonTitle = lesson.kind === 'recitation' ? 'تسميع وتلاوة القرآن الكريم' : (lesson.name ?? 'درس');
      const teacherName = teacherUser?.fullName ?? null;

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
    } else {
      report.markWebhookDisabled();
    }

    await this.reportRepo.save(report);

    return {
      reportId: report.id,
      webhookStatus: report.webhookStatus,
    };
  }
}
