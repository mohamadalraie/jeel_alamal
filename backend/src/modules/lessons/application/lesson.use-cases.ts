import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { MANAGER_ASSIGNMENTS } from '../../institutes/domain/manager-assignment.repository';
import type { ManagerAssignmentRepository } from '../../institutes/domain/manager-assignment.repository';
import { Lesson, LessonSourceData } from '../domain/lesson.entity';
import { LessonClassBinding } from '../domain/lesson-class-binding.entity';
import { LessonKind } from '../domain/lesson-kind';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import {
  CreateLessonDto,
  LessonAssignmentDto,
  LessonSourceDto,
  UpdateLessonDto,
} from './dto/lesson.dto';

const toSources = (dtos?: LessonSourceDto[]): LessonSourceData[] =>
  (dtos ?? []).map((s, i) => ({
    kind: s.kind,
    url: s.url,
    description: s.description ?? null,
    sort: i,
  }));

/** Shared validation: every class + teacher of an assignment belongs to the institute. */
abstract class LessonBase {
  protected constructor(
    protected readonly policy: InstituteAccessPolicy,
    protected readonly lessons: LessonRepository,
    protected readonly classes: ClassRepository,
    protected readonly users: UserRepository,
    protected readonly assignments: ManagerAssignmentRepository,
  ) {}

  /** Validate assignments and build the binding entities for a lesson. */
  protected async buildBindings(
    lessonId: string,
    instituteId: string,
    dtos: LessonAssignmentDto[],
  ): Promise<LessonClassBinding[]> {
    const seen = new Set<string>();
    const bindings: LessonClassBinding[] = [];
    for (const a of dtos) {
      if (seen.has(a.classId)) {
        throw new BusinessRuleError('A class is listed more than once');
      }
      seen.add(a.classId);

      const klass = await this.classes.findById(a.classId);
      if (!klass || klass.instituteId !== instituteId) {
        throw new BusinessRuleError(
          'A selected class is not in this institute',
        );
      }
      await this.assertCanTeach(a.teacherId, instituteId);
      const isClassMember = await this.classes.isTeacherOfClass(
        a.classId,
        a.teacherId,
      );
      if (!isClassMember) {
        throw new BusinessRuleError(
          'The assigned teacher is not a member of the selected class',
        );
      }
      bindings.push(
        LessonClassBinding.create({
          lessonId,
          classId: a.classId,
          teacherId: a.teacherId,
        }),
      );
    }
    return bindings;
  }

  /** The assigned teacher must be a teacher of the institute or a manager of it. */
  protected async assertCanTeach(
    userId: string,
    instituteId: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new BusinessRuleError('Assigned teacher not found');
    if (user.role === UserRole.Teacher && user.instituteId === instituteId)
      return;
    if (
      user.role === UserRole.InstituteManager &&
      (await this.assignments.isAssigned(userId, instituteId))
    ) {
      return;
    }
    throw new BusinessRuleError(
      'The assigned teacher is not a teacher of this institute',
    );
  }

  protected async assertCategoryInInstitute(
    categoryId: string | null | undefined,
    instituteId: string,
  ): Promise<void> {
    if (!categoryId) return;
    const category = await this.lessons.findCategoryById(categoryId);
    if (!category || category.instituteId !== instituteId) {
      throw new BusinessRuleError('Category is not in this institute');
    }
  }
}

/** Create a lesson (or recitation) and schedule it to one or more classes. Manager. */
@Injectable()
export class CreateLessonUseCase extends LessonBase {
  constructor(
    policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) lessons: LessonRepository,
    @Inject(CLASS_REPOSITORY) classes: ClassRepository,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(MANAGER_ASSIGNMENTS) assignments: ManagerAssignmentRepository,
  ) {
    super(policy, lessons, classes, users, assignments);
  }

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateLessonDto,
  ): Promise<{ lessonId: string }> {
    await this.policy.assertManagerOf(actor, instituteId);
    const isLesson = dto.kind === LessonKind.Lesson;
    await this.assertCategoryInInstitute(
      isLesson ? dto.categoryId : null,
      instituteId,
    );

    const lesson = Lesson.create({
      instituteId,
      kind: dto.kind,
      name: isLesson ? (dto.name ?? null) : null,
      description: isLesson ? (dto.description ?? null) : null,
      categoryId: isLesson ? (dto.categoryId ?? null) : null,
      date: dto.date,
      expectedDurationMinutes: dto.expectedDurationMinutes ?? null,
      sources: isLesson ? toSources(dto.sources) : [],
      createdBy: actor.userId,
    });
    const bindings = await this.buildBindings(
      lesson.id,
      instituteId,
      dto.assignments,
    );
    await this.lessons.createLesson(lesson, bindings);
    return { lessonId: lesson.id };
  }
}

/** Edit a lesson's shared content (and optionally its class bindings). Manager. */
@Injectable()
export class UpdateLessonUseCase extends LessonBase {
  constructor(
    policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) lessons: LessonRepository,
    @Inject(CLASS_REPOSITORY) classes: ClassRepository,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(MANAGER_ASSIGNMENTS) assignments: ManagerAssignmentRepository,
  ) {
    super(policy, lessons, classes, users, assignments);
  }

  async execute(
    actor: Actor,
    lessonId: string,
    dto: UpdateLessonDto,
  ): Promise<void> {
    const lesson = await this.lessons.findLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    await this.policy.assertManagerOf(actor, lesson.instituteId);

    if (lesson.kind === LessonKind.Lesson && dto.categoryId !== undefined) {
      await this.assertCategoryInInstitute(dto.categoryId, lesson.instituteId);
    }

    // Expected duration is locked once any binding has advanced past pending —
    // the evaluation basis must stay deterministic mid-delivery (FR-002).
    if (dto.expectedDurationMinutes !== undefined) {
      const locked = await this.lessons.hasAnyStartedBinding(lesson.id);
      if (locked) {
        throw new BusinessRuleError(
          'Cannot change expected duration after the lesson has started',
        );
      }
    }

    lesson.edit({
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId,
      date: dto.date,
      expectedDurationMinutes: dto.expectedDurationMinutes,
      sources:
        lesson.kind === LessonKind.Lesson && dto.sources
          ? toSources(dto.sources)
          : undefined,
    });
    await this.lessons.updateLesson(lesson);

    if (dto.assignments) {
      const bindings = await this.buildBindings(
        lesson.id,
        lesson.instituteId,
        dto.assignments,
      );
      await this.lessons.setBindings(lesson.id, bindings);
    }
  }
}

/** Delete a lesson with all its sources and class bindings. Manager. */
@Injectable()
export class DeleteLessonUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, lessonId: string): Promise<void> {
    const lesson = await this.lessons.findLessonById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    await this.policy.assertManagerOf(actor, lesson.instituteId);
    await this.lessons.deleteLesson(lessonId);
  }
}

/** Remove a lesson from one class (leaves the shared lesson + other classes). Manager. */
@Injectable()
export class RemoveLessonClassUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, lessonClassId: string): Promise<void> {
    const binding = await this.lessons.findBindingById(lessonClassId);
    if (!binding) throw new NotFoundError('Lesson assignment not found');
    const lesson = await this.lessons.findLessonById(binding.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    await this.policy.assertManagerOf(actor, lesson.instituteId);
    await this.lessons.removeBinding(lessonClassId);
  }
}

/** Set the order of a class's entries on a given date. Manager. */
@Injectable()
export class ReorderClassDayUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    date: string,
    orderedLessonClassIds: string[],
  ): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertManagerOf(actor, klass.instituteId);
    await this.lessons.reorderClassDay(classId, date, orderedLessonClassIds);
  }
}
