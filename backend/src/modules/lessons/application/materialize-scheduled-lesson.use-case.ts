import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { LESSON_REPOSITORY, type LessonRepository } from '../domain/lesson.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { Lesson } from '../domain/lesson.entity';
import { LessonClassBinding } from '../domain/lesson-class-binding.entity';
import { MaterializeScheduledLessonDto, MaterializeResult } from './dto/materialize-lesson.dto';
import { UserRole } from '../../../shared/domain/user-role';

const todayISO = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class MaterializeScheduledLessonUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    dto: MaterializeScheduledLessonDto,
  ): Promise<MaterializeResult> {
    const klass = await this.classes.findById(dto.classId);
    if (!klass) throw new NotFoundError('Class not found');

    const isManager =
      actor.role === UserRole.InstituteManager ||
      actor.role === UserRole.SuperAdmin;

    if (!isManager) {
      if (actor.role !== UserRole.Teacher) {
        throw new ForbiddenError('Only teachers or managers can materialize lessons');
      }
      const isTeacher = await this.classes.isTeacherOfClass(dto.classId, actor.userId);
      if (!isTeacher) {
        throw new ForbiddenError('You are not assigned as a teacher for this class');
      }
    } else {
      await this.policy.assertStaffOf(actor, klass.instituteId);
    }

    // Create concrete Lesson definition
    const lesson = Lesson.create({
      instituteId: klass.instituteId,
      kind: dto.kind,
      name: dto.name,
      subjectId: dto.subjectId ?? null,
      description: dto.description ?? null,
      categoryId: dto.categoryId ?? null,
      date: dto.date,
      expectedDurationMinutes: dto.expectedDurationMinutes ?? null,
      createdBy: actor.userId,
    });

    // Create binding for this class
    let teacherId = actor.userId;
    if (dto.scheduleSlotId) {
      const schedule = await this.classes.getSchedule(klass.id);
      const slot = schedule.find((s) => s.id === dto.scheduleSlotId);
      if (slot?.teacherId) {
        teacherId = slot.teacherId;
      }
    }
    if (teacherId === actor.userId && actor.role !== UserRole.Teacher) {
      const membership = await this.classes.getMembership(klass.id);
      if (membership.teacherIds.length > 0) {
        teacherId = membership.teacherIds[0];
      }
    }

    const binding = LessonClassBinding.create({
      lessonId: lesson.id,
      classId: klass.id,
      teacherId,
    });

    let started = false;
    if (dto.startImmediately) {
      const today = todayISO();
      if (dto.date > today) {
        throw new BusinessRuleError('Cannot start a lesson before its scheduled date');
      }
      binding.start(new Date());
      started = true;
    }

    await this.lessons.createLesson(lesson, [binding]);

    return {
      lessonId: lesson.id,
      lessonClassId: binding.id,
      started,
    };
  }
}
