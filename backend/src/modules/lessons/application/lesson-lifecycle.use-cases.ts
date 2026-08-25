import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import { LESSON_SETTINGS_REPOSITORY } from '../domain/lesson-settings.repository';
import type { LessonSettingsRepository } from '../domain/lesson-settings.repository';
import { LessonSettings } from '../domain/lesson-settings.entity';
import { EndLessonResult, LessonTimerView } from './dto/lesson.dto';

const todayYMD = () => new Date().toISOString().slice(0, 10);

/**
 * Begin a lesson: pending → started (spec 009, US2). Only the teacher assigned
 * to this specific binding may start it, and only on/after the lesson date.
 */
@Injectable()
export class StartLessonUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, lessonClassId: string): Promise<void> {
    const binding = await this.lessons.findBindingById(lessonClassId);
    if (!binding) throw new NotFoundError('Lesson assignment not found');
    if (binding.teacherId !== actor.userId) {
      throw new ForbiddenError(
        'Only the assigned teacher can start this lesson',
      );
    }
    const lesson = await this.lessons.findLessonById(binding.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');
    if (lesson.date > todayYMD()) {
      throw new BusinessRuleError(
        'This lesson cannot be started before its date',
      );
    }

    binding.start(new Date());
    const updated = await this.lessons.updateBindingLifecycle(
      binding,
      'pending',
    );
    if (!updated) {
      throw new ConflictError('Lesson has already been started');
    }
  }
}

/**
 * End a lesson: started → finished | over_time | under_time (spec 009, US2/US4).
 * The final status is decided by the institute's LessonSettings comparison.
 */
@Injectable()
export class EndLessonUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
    @Inject(LESSON_SETTINGS_REPOSITORY)
    private readonly settingsRepo: LessonSettingsRepository,
  ) {}

  async execute(actor: Actor, lessonClassId: string): Promise<EndLessonResult> {
    const binding = await this.lessons.findBindingById(lessonClassId);
    if (!binding) throw new NotFoundError('Lesson assignment not found');
    if (binding.teacherId !== actor.userId) {
      throw new ForbiddenError('Only the assigned teacher can end this lesson');
    }
    const lesson = await this.lessons.findLessonById(binding.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const settings =
      (await this.settingsRepo.findByInstitute(lesson.instituteId)) ??
      LessonSettings.defaults(lesson.instituteId);

    const actualDurationMinutes = binding.end(new Date());
    const status = settings.evaluate(
      actualDurationMinutes,
      lesson.expectedDurationMinutes,
    );
    binding.applyStatus(status);

    const updated = await this.lessons.updateBindingLifecycle(
      binding,
      'started',
    );
    if (!updated) {
      throw new ConflictError('Lesson is not currently in progress');
    }
    return { status, actualDurationMinutes };
  }
}

/**
 * The timer page payload for one binding (spec 009). Assigned teacher only —
 * the page is a private teacher workspace.
 */
@Injectable()
export class GetLessonTimerUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, lessonClassId: string): Promise<LessonTimerView> {
    const view = await this.lessons.getBindingTimerView(lessonClassId);
    if (!view) throw new NotFoundError('Lesson assignment not found');
    if (view.teacherId !== actor.userId) {
      throw new ForbiddenError(
        'Only the assigned teacher can view this lesson timer',
      );
    }
    return {
      lessonClassId: view.lessonClassId,
      kind: view.kind,
      name: view.name,
      date: view.date,
      className: view.className,
      expectedDurationMinutes: view.expectedDurationMinutes,
      status: view.status,
      actualStartTime: view.actualStartTime?.toISOString() ?? null,
      ordinal: view.ordinal,
      ofTotal: view.ofTotal,
    };
  }
}
