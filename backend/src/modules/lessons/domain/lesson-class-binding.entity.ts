import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import type { FinalLessonStatus, StoredLessonStatus } from './lesson-binding-status';

interface LessonClassBindingProps {
  lessonId: string;
  classId: string;
  teacherId: string;
  sort: number;
  status: StoredLessonStatus;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
}

/**
 * The per-class binding of a lesson — its OWN id, the class it applies to, the
 * assigned teacher, and the order within that class's day (spec 008). Spec 009
 * adds the delivery lifecycle: status + actual start/end timestamps. Many
 * bindings can reference one Lesson definition (no content duplication).
 */
export class LessonClassBinding extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: LessonClassBindingProps,
  ) {
    super(id);
  }

  static create(input: {
    lessonId: string;
    classId: string;
    teacherId: string;
    sort?: number;
  }): LessonClassBinding {
    return new LessonClassBinding(randomUUID(), {
      lessonId: input.lessonId,
      classId: input.classId,
      teacherId: input.teacherId,
      sort: input.sort ?? 0,
      status: 'pending',
      actualStartTime: null,
      actualEndTime: null,
    });
  }

  static reconstitute(id: string, props: LessonClassBindingProps): LessonClassBinding {
    return new LessonClassBinding(id, props);
  }

  /**
   * Begin the lesson: pending → started. Records the server-side start time.
   * Throws if the binding is not pending (already started or terminal).
   */
  start(now: Date): void {
    if (this.props.status !== 'pending') {
      throw new BusinessRuleError('Lesson can only be started while pending');
    }
    this.props.status = 'started';
    this.props.actualStartTime = now;
  }

  /**
   * End the lesson: records the end time and returns the actual duration in
   * minutes (ceiling of elapsed seconds / 60, minimum 1). The final status is
   * computed by the use-case via LessonSettings.evaluate() then applied with
   * applyStatus() — keeping settings knowledge out of the entity.
   */
  end(now: Date): number {
    if (this.props.status !== 'started') {
      throw new BusinessRuleError('Lesson can only be ended while started');
    }
    if (!this.props.actualStartTime) {
      throw new BusinessRuleError('Lesson has no recorded start time');
    }
    this.props.actualEndTime = now;
    const ms = now.getTime() - this.props.actualStartTime.getTime();
    return Math.max(1, Math.ceil(ms / 60_000));
  }

  /** Apply the terminal status derived from the duration evaluation. */
  applyStatus(status: FinalLessonStatus): void {
    this.props.status = status;
  }

  get lessonId() {
    return this.props.lessonId;
  }
  get classId() {
    return this.props.classId;
  }
  get teacherId() {
    return this.props.teacherId;
  }
  get sort() {
    return this.props.sort;
  }
  get status() {
    return this.props.status;
  }
  get actualStartTime() {
    return this.props.actualStartTime;
  }
  get actualEndTime() {
    return this.props.actualEndTime;
  }
}
