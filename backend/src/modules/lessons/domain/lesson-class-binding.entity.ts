import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';

interface LessonClassBindingProps {
  lessonId: string;
  classId: string;
  teacherId: string;
  sort: number;
}

/**
 * The per-class binding of a lesson — its OWN id, the class it applies to, the
 * assigned teacher, and the order within that class's day (spec 008). Many
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
    });
  }

  static reconstitute(id: string, props: LessonClassBindingProps): LessonClassBinding {
    return new LessonClassBinding(id, props);
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
}
