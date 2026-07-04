import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { NotFoundError } from '../../../shared/domain/domain.error';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository, ProgramEntryRead } from '../domain/lesson.repository';
import {
  ClassProgramResult,
  InstituteLessonView,
  ProgramEntryView,
} from './dto/lesson.dto';

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

/** Group flat per-binding rows into one entry per lesson (institute hub). */
export function groupByLesson(rows: ProgramEntryRead[]): InstituteLessonView[] {
  const byLesson = new Map<string, InstituteLessonView>();
  for (const r of rows) {
    let entry = byLesson.get(r.lessonId);
    if (!entry) {
      entry = {
        lessonId: r.lessonId,
        kind: r.kind,
        name: r.name,
        description: r.description,
        category: r.category,
        date: r.date,
        sources: r.sources,
        classes: [],
      };
      byLesson.set(r.lessonId, entry);
    }
    entry.classes.push({
      lessonClassId: r.lessonClassId,
      classId: r.classId,
      className: r.className,
      teacher: r.teacher,
    });
  }
  // Preserve the repo's date,sort ordering (Map keeps insertion order).
  return [...byLesson.values()];
}

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

/** Institute-wide lessons hub (all classes), one entry per lesson. Staff. */
@Injectable()
export class GetInstituteProgramUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    from?: string,
    to?: string,
  ): Promise<{ entries: InstituteLessonView[] }> {
    await this.policy.assertStaffOf(actor, instituteId);
    const rows = await this.lessons.getInstituteProgram(instituteId, from, to);
    return { entries: groupByLesson(rows) };
  }
}
