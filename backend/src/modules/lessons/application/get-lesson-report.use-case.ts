import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import { LESSON_REPOSITORY, type LessonRepository } from '../domain/lesson.repository';
import {
  LESSON_REPORT_REPOSITORY,
  type LessonReportRepository,
} from '../domain/lesson-report.repository';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/user.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { LessonReportView } from './dto/lesson-report.dto';

@Injectable()
export class GetLessonReportUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
    @Inject(LESSON_REPORT_REPOSITORY)
    private readonly reportRepo: LessonReportRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    lessonClassId: string,
  ): Promise<LessonReportView> {
    const report = await this.reportRepo.findByBindingId(lessonClassId);
    if (!report) throw new NotFoundError('Lesson report not found');

    const binding = await this.lessons.findBindingById(lessonClassId);
    if (!binding) throw new NotFoundError('Lesson assignment not found');

    const lesson = await this.lessons.findLessonById(binding.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const klass = await this.classes.findById(binding.classId);
    if (!klass) throw new NotFoundError('Class not found');

    // Multi-tenancy & access check
    if (actor.role === UserRole.Student) {
      const current = await this.classes.findCurrentClassOfStudent(actor.userId);
      const intensive = await this.classes.findCurrentIntensiveClassOfStudent(actor.userId);
      if (current?.id !== klass.id && intensive?.id !== klass.id) {
        throw new ForbiddenError('Not enrolled in this class');
      }
    } else {
      await this.policy.assertStaffOf(actor, klass.instituteId);
    }

    const [teacherUser, subjects] = await Promise.all([
      this.users.findById(binding.teacherId),
      lesson.subjectId
        ? this.lessons.listSubjects(lesson.instituteId, false)
        : Promise.resolve([]),
    ]);

    const subjectName = lesson.subjectId
      ? subjects.find((s) => s.id === lesson.subjectId)?.name ?? null
      : null;

    let actualDurationMinutes: number | null = null;
    if (binding.actualStartTime && binding.actualEndTime) {
      const ms = binding.actualEndTime.getTime() - binding.actualStartTime.getTime();
      actualDurationMinutes = Math.max(1, Math.ceil(ms / 60_000));
    }

    const isManager =
      actor.role === UserRole.InstituteManager ||
      actor.role === UserRole.SuperAdmin;
    const isAssignedTeacher = binding.teacherId === actor.userId;
    const canEdit = isManager || isAssignedTeacher;

    const baseView: LessonReportView = {
      id: report.id,
      lessonClassId: report.lessonClassId,
      lessonId: lesson.id,
      lessonTitle: lesson.kind === 'recitation' ? 'تسميع وتلاوة القرآن' : (lesson.name ?? 'درس'),
      subjectName,
      className: klass.name,
      teacherName: teacherUser?.fullName ?? null,
      date: lesson.date,
      actualDurationMinutes,
      expectedDurationMinutes: lesson.expectedDurationMinutes,
      mainIdeas: report.mainIdeas,
      submittedBy: report.submittedBy,
      webhookStatus: report.webhookStatus,
      webhookError: canEdit ? report.webhookError : undefined,
      webhookSentAt: report.webhookSentAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      canEdit,
    };

    // Role-based redaction: Students/parents only receive general info + mainIdeas
    if (actor.role === UserRole.Student) {
      return baseView;
    }

    // Teachers & Managers receive the full internal evaluation
    return {
      ...baseView,
      positives: report.positives,
      negatives: report.negatives,
      teacherNotes: report.teacherNotes,
    };
  }
}
