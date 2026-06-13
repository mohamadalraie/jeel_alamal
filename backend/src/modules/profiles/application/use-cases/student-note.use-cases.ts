import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { NotFoundError } from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { StudentNote } from '../../domain/student-note.entity';
import { STUDENT_NOTE_REPOSITORY } from '../../domain/student-note.repository';
import type { StudentNoteRepository } from '../../domain/student-note.repository';
import { ProfileAccessPolicy } from '../profile-access.policy';
import { NoteDto } from '../dto/profile.dto';

/**
 * Student notes (spec 002). All operations require institute staff; a student
 * actor can never reach these — `assertStaffOfInstitute` rejects students. Each
 * note records its author and resolves the author's display name on read.
 */
abstract class NoteBase {
  protected constructor(
    protected readonly policy: ProfileAccessPolicy,
    protected readonly users: UserRepository,
    protected readonly notes: StudentNoteRepository,
  ) {}

  protected async ensureStudent(instituteId: string, studentId: string) {
    const student = await this.users.findById(studentId);
    if (
      !student ||
      student.role !== UserRole.Student ||
      student.instituteId !== instituteId
    ) {
      throw new NotFoundError('Student not found in this institute');
    }
  }

  protected async toDto(note: StudentNote): Promise<NoteDto> {
    const author = await this.users.findById(note.authorId);
    return {
      id: note.id,
      body: note.body,
      authorId: note.authorId,
      authorName: author ? author.fullName : 'Unknown',
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}

@Injectable()
export class ListStudentNotesUseCase extends NoteBase {
  constructor(
    policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(STUDENT_NOTE_REPOSITORY) notes: StudentNoteRepository,
  ) {
    super(policy, users, notes);
  }

  async execute(
    actor: Actor,
    instituteId: string,
    studentId: string,
  ): Promise<NoteDto[]> {
    await this.policy.assertStaffOfInstitute(actor, instituteId);
    await this.ensureStudent(instituteId, studentId);
    const notes = await this.notes.findByStudent(studentId);
    return Promise.all(notes.map((n) => this.toDto(n)));
  }
}

@Injectable()
export class AddStudentNoteUseCase extends NoteBase {
  constructor(
    policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(STUDENT_NOTE_REPOSITORY) notes: StudentNoteRepository,
  ) {
    super(policy, users, notes);
  }

  async execute(
    actor: Actor,
    instituteId: string,
    studentId: string,
    body: string,
  ): Promise<NoteDto> {
    await this.policy.assertStaffOfInstitute(actor, instituteId);
    await this.ensureStudent(instituteId, studentId);
    const note = StudentNote.create({ studentId, authorId: actor.userId, body });
    await this.notes.save(note);
    return this.toDto(note);
  }
}

@Injectable()
export class UpdateStudentNoteUseCase extends NoteBase {
  constructor(
    policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(STUDENT_NOTE_REPOSITORY) notes: StudentNoteRepository,
  ) {
    super(policy, users, notes);
  }

  async execute(
    actor: Actor,
    instituteId: string,
    noteId: string,
    body: string,
  ): Promise<NoteDto> {
    await this.policy.assertStaffOfInstitute(actor, instituteId);
    const note = await this.notes.findById(noteId);
    if (!note) throw new NotFoundError('Note not found');
    await this.ensureStudent(instituteId, note.studentId);
    note.edit(body);
    await this.notes.save(note);
    return this.toDto(note);
  }
}

@Injectable()
export class DeleteStudentNoteUseCase extends NoteBase {
  constructor(
    policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) users: UserRepository,
    @Inject(STUDENT_NOTE_REPOSITORY) notes: StudentNoteRepository,
  ) {
    super(policy, users, notes);
  }

  async execute(
    actor: Actor,
    instituteId: string,
    noteId: string,
  ): Promise<void> {
    await this.policy.assertStaffOfInstitute(actor, instituteId);
    const note = await this.notes.findById(noteId);
    if (!note) throw new NotFoundError('Note not found');
    await this.ensureStudent(instituteId, note.studentId);
    await this.notes.delete(noteId);
  }
}
