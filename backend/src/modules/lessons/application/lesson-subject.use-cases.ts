import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { NotFoundError } from '../../../shared/domain/domain.error';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { LessonSubject } from '../domain/lesson-subject.entity';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import type { SubjectView } from './dto/lesson.dto';

const toView = (s: LessonSubject): SubjectView => ({
  id: s.id,
  name: s.name,
  color: s.color,
  isArchived: s.isArchived,
});

/** Create a lesson subject for an institute. Manager only. */
@Injectable()
export class AddSubjectUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: { name: string; color?: string | null },
  ): Promise<SubjectView> {
    await this.policy.assertManagerOf(actor, instituteId);
    const subject = LessonSubject.create({
      instituteId,
      name: dto.name,
      color: dto.color,
    });
    await this.lessons.addSubject(subject);
    return toView(subject);
  }
}

/** List an institute's subjects. Institute staff. */
@Injectable()
export class ListSubjectsUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    includeArchived = false,
  ): Promise<SubjectView[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const subjects = await this.lessons.listSubjects(instituteId, includeArchived);
    return subjects.map(toView);
  }
}

/** Rename / recolor a subject. Manager only. */
@Injectable()
export class UpdateSubjectUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    subjectId: string,
    dto: { name: string; color?: string | null },
  ): Promise<void> {
    const subject = await this.lessons.findSubjectById(subjectId);
    if (!subject) throw new NotFoundError('Subject not found');
    await this.policy.assertManagerOf(actor, subject.instituteId);
    subject.update(dto.name, dto.color);
    await this.lessons.saveSubject(subject);
  }
}

/** Archive a subject (soft delete). Manager only. */
@Injectable()
export class ArchiveSubjectUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, subjectId: string): Promise<void> {
    const subject = await this.lessons.findSubjectById(subjectId);
    if (!subject) throw new NotFoundError('Subject not found');
    await this.policy.assertManagerOf(actor, subject.instituteId);
    subject.archive();
    await this.lessons.saveSubject(subject);
  }
}

/** Unarchive a subject. Manager only. */
@Injectable()
export class UnarchiveSubjectUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, subjectId: string): Promise<void> {
    const subject = await this.lessons.findSubjectById(subjectId);
    if (!subject) throw new NotFoundError('Subject not found');
    await this.policy.assertManagerOf(actor, subject.instituteId);
    subject.unarchive();
    await this.lessons.saveSubject(subject);
  }
}
