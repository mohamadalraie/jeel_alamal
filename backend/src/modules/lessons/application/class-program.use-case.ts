import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { NotFoundError } from '../../../shared/domain/domain.error';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository, ProgramEntryRead } from '../domain/lesson.repository';
import { ClassProgramResult, ProgramEntryView } from './dto/lesson.dto';

export const toEntryView = (e: ProgramEntryRead): ProgramEntryView => ({
  lessonClassId: e.lessonClassId,
  lessonId: e.lessonId,
  kind: e.kind,
  name: e.name,
  description: e.description,
  category: e.category,
  date: e.date,
  sort: e.sort,
  teacher: e.teacher,
  className: e.className,
  sources: e.sources,
});

/** The full lessons program of a class. Institute staff (manager + teacher). */
@Injectable()
export class GetClassProgramUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    from?: string,
    to?: string,
  ): Promise<ClassProgramResult> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertStaffOf(actor, klass.instituteId);

    const entries = await this.lessons.getClassProgram(classId, from, to);
    return {
      lessonsVisibleToStudents: klass.lessonsVisibleToStudents,
      entries: entries.map(toEntryView),
    };
  }
}
