import { AddStudentNoteUseCase } from './student-note.use-cases';
import { ProfileAccessPolicy } from '../profile-access.policy';
import { StudentNote } from '../../domain/student-note.entity';
import type { StudentNoteRepository } from '../../domain/student-note.repository';
import { User } from '../../../users/domain/user.entity';
import { Username } from '../../../users/domain/value-objects/username.vo';
import type { UserRepository } from '../../../users/domain/user.repository';
import type { ManagerAssignmentRepository } from '../../../institutes/domain/manager-assignment.repository';
import { UserRole } from '../../../../shared/domain/user-role';
import { ForbiddenError } from '../../../../shared/domain/domain.error';
import type { Actor } from '../../../../shared/application/actor';

const INST = 'inst-1';

function makeStudent() {
  return User.create({
    username: Username.create('student.one'),
    firstName: 'Sara',
    lastName: 'Student',
    passwordHash: 'x',
    role: UserRole.Student,
    instituteId: INST,
  });
}

class FakeUsers implements Partial<UserRepository> {
  constructor(private readonly student: User) {}
  findById(id: string) {
    if (id === this.student.id) return Promise.resolve(this.student);
    if (id === 'teacher-1') {
      return Promise.resolve(
        User.create({
          username: Username.create('teacher.one'),
          firstName: 'Ahmad',
          lastName: 'Teacher',
          passwordHash: 'x',
          role: UserRole.Teacher,
          instituteId: INST,
        }),
      );
    }
    return Promise.resolve(null);
  }
}

class FakeNotes implements StudentNoteRepository {
  saved: StudentNote[] = [];
  save(n: StudentNote) {
    this.saved.push(n);
    return Promise.resolve();
  }
  findById() {
    return Promise.resolve(null);
  }
  findByStudent() {
    return Promise.resolve(this.saved);
  }
  delete() {
    return Promise.resolve();
  }
}

const assignments: ManagerAssignmentRepository = {
  isAssigned: () => Promise.resolve(true),
  assign: () => Promise.resolve(),
  unassign: () => Promise.resolve(),
  countManagers: () => Promise.resolve(1),
  findManagerIdsByInstitute: () => Promise.resolve([]),
};

describe('Student notes (spec 002)', () => {
  let student: User;
  let users: FakeUsers;
  let notes: FakeNotes;
  let useCase: AddStudentNoteUseCase;

  beforeEach(() => {
    student = makeStudent();
    users = new FakeUsers(student);
    notes = new FakeNotes();
    const policy = new ProfileAccessPolicy(assignments);
    useCase = new AddStudentNoteUseCase(
      policy,
      users as unknown as UserRepository,
      notes,
    );
  });

  it('records the author when a teacher adds a note', async () => {
    const teacher: Actor = {
      userId: 'teacher-1',
      role: UserRole.Teacher,
      instituteId: INST,
    };
    const dto = await useCase.execute(
      teacher,
      INST,
      student.id,
      'Great progress',
    );
    expect(notes.saved).toHaveLength(1);
    expect(notes.saved[0].authorId).toBe('teacher-1');
    expect(dto.body).toBe('Great progress');
  });

  it('forbids a student from adding notes (students can never touch notes)', async () => {
    const studentActor: Actor = {
      userId: student.id,
      role: UserRole.Student,
      instituteId: INST,
    };
    await expect(
      useCase.execute(studentActor, INST, student.id, 'hack'),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(notes.saved).toHaveLength(0);
  });
});
