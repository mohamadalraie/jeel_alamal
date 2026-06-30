import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import { TeacherProgramEntry } from './dto/lesson.dto';
import { toEntryView } from './class-program.use-case';

const todayISO = () => new Date().toISOString().slice(0, 10);

/** The lessons assigned to the acting teacher, with the next upcoming flagged. */
@Injectable()
export class GetMyLessonsUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor): Promise<{ entries: TeacherProgramEntry[] }> {
    const raw = await this.lessons.getTeacherProgram(actor.userId); // sorted date,sort
    const today = todayISO();
    // The next lesson = the first entry dated today or later.
    const nextIdx = raw.findIndex((e) => e.date >= today);
    const entries = raw.map((e, i) => ({ ...toEntryView(e), isNext: i === nextIdx }));
    return { entries };
  }
}
