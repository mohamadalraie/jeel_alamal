import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import { LESSON_REPOSITORY, type LessonRepository } from '../domain/lesson.repository';
import {
  LESSON_REPORT_REPOSITORY,
  type LessonReportRepository,
} from '../domain/lesson-report.repository';
import { UpdateLessonReportDto } from './dto/lesson-report.dto';

@Injectable()
export class UpdateLessonReportUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
    @Inject(LESSON_REPORT_REPOSITORY)
    private readonly reportRepo: LessonReportRepository,
  ) {}

  async execute(
    actor: Actor,
    lessonClassId: string,
    dto: UpdateLessonReportDto,
  ): Promise<void> {
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
        'Only the assigned teacher or manager can edit this lesson report',
      );
    }

    report.update({
      mainIdeas: dto.mainIdeas,
      positives: dto.positives,
      negatives: dto.negatives,
    });

    await this.reportRepo.update(report);
  }
}
