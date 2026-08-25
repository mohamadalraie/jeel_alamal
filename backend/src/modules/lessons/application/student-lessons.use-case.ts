import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import { StudentLessonView } from './dto/lesson.dto';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * A class's lessons as seen by its students: only when the manager enabled it,
 * only past entries (date <= today), and only name + description (no sources,
 * no future). Recitation entries keep their kind so the UI shows the label.
 */
@Injectable()
export class GetStudentClassLessonsUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
  ): Promise<{ entries: StudentLessonView[] }> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');

    // Only a student of this class, and only when the manager turned it on.
    const isStudentOfClass =
      actor.role === UserRole.Student &&
      (await this.classes.isStudentOfClass(classId, actor.userId));
    if (!isStudentOfClass || !klass.lessonsVisibleToStudents) {
      throw new ForbiddenError('Lessons are not available for this class');
    }

    const past = await this.lessons.getClassProgramUpTo(classId, todayISO());
    const entries: StudentLessonView[] = past.map((e) => ({
      lessonClassId: e.lessonClassId,
      kind: e.kind,
      name: e.name,
      description: e.description,
      date: e.date,
    }));
    return { entries };
  }
}
