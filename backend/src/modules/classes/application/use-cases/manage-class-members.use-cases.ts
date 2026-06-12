import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/domain.error';
import { Class } from '../../domain/class.entity';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';

/**
 * Class membership management (spec 001). Shared guards:
 * - the class must exist; the target user must exist, hold the expected role,
 *   and belong to the SAME institute as the class (tenant isolation).
 */
abstract class ClassMembershipBase {
  protected constructor(
    protected readonly policy: InstituteAccessPolicy,
    protected readonly classes: ClassRepository,
    protected readonly users: UserRepository,
  ) {}

  protected async getClassOrFail(classId: string): Promise<Class> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    return klass;
  }

  protected async getMemberOrFail(
    userId: string,
    role: UserRole,
    instituteId: string,
  ) {
    const user = await this.users.findById(userId);
    if (!user || user.role !== role || user.instituteId !== instituteId) {
      throw new BusinessRuleError(
        `Target user is not a ${role} of this institute`,
      );
    }
    return user;
  }
}

/** Add a teacher to a class. Permission: assigned manager. */
@Injectable()
export class AddClassTeacherUseCase extends ClassMembershipBase {
  constructor(
    policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) classes: ClassRepository,
    @Inject(USER_REPOSITORY) users: UserRepository,
  ) {
    super(policy, classes, users);
  }

  async execute(actor: Actor, classId: string, teacherId: string): Promise<void> {
    const klass = await this.getClassOrFail(classId);
    await this.policy.assertManagerOf(actor, klass.instituteId);
    await this.getMemberOrFail(teacherId, UserRole.Teacher, klass.instituteId);
    if (await this.classes.isTeacherOfClass(classId, teacherId)) {
      throw new ConflictError('Teacher is already in this class');
    }
    await this.classes.addTeacher(classId, teacherId);
  }
}

/**
 * Set the class supervisor. Permission: assigned manager. The supervisor must
 * already be one of the class teachers; the DB partial unique index guarantees
 * at most one supervisor even under races.
 */
@Injectable()
export class SetClassSupervisorUseCase extends ClassMembershipBase {
  constructor(
    policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) classes: ClassRepository,
    @Inject(USER_REPOSITORY) users: UserRepository,
  ) {
    super(policy, classes, users);
  }

  async execute(actor: Actor, classId: string, teacherId: string): Promise<void> {
    const klass = await this.getClassOrFail(classId);
    await this.policy.assertManagerOf(actor, klass.instituteId);
    if (!(await this.classes.isTeacherOfClass(classId, teacherId))) {
      throw new BusinessRuleError(
        'The supervisor must first be added as a class teacher',
      );
    }
    await this.classes.setSupervisor(classId, teacherId);
  }
}

/**
 * Enroll a student in a class. Permission: assigned manager OR a teacher OF
 * THIS CLASS (spec 001: "the manager or the teacher can add the students").
 */
@Injectable()
export class EnrollStudentUseCase extends ClassMembershipBase {
  constructor(
    policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) classes: ClassRepository,
    @Inject(USER_REPOSITORY) users: UserRepository,
  ) {
    super(policy, classes, users);
  }

  async execute(actor: Actor, classId: string, studentId: string): Promise<void> {
    const klass = await this.getClassOrFail(classId);

    const isClassTeacher =
      actor.role === UserRole.Teacher &&
      actor.instituteId === klass.instituteId &&
      (await this.classes.isTeacherOfClass(classId, actor.userId));
    if (!isClassTeacher) {
      // Not a teacher of this class — must be an assigned manager.
      if (actor.role !== UserRole.InstituteManager) {
        throw new ForbiddenError('Only the manager or a class teacher can enroll students');
      }
      await this.policy.assertManagerOf(actor, klass.instituteId);
    }

    await this.getMemberOrFail(studentId, UserRole.Student, klass.instituteId);
    if (await this.classes.isStudentOfClass(classId, studentId)) {
      throw new ConflictError('Student is already enrolled in this class');
    }
    await this.classes.addStudent(classId, studentId);
  }
}
