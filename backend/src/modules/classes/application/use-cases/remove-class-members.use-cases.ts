import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/domain.error';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';

/** Remove a teacher from a class (manager/super_admin). */
@Injectable()
export class RemoveClassTeacherUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    teacherId: string,
  ): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertManagerOf(actor, klass.instituteId);
    await this.classes.removeTeacher(classId, teacherId);
  }
}

/**
 * Remove a student from a class (manager/super_admin, or a teacher of the class).
 */
@Injectable()
export class RemoveClassStudentUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    studentId: string,
  ): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');

    const isClassTeacher =
      actor.role === UserRole.Teacher &&
      actor.instituteId === klass.instituteId &&
      (await this.classes.isTeacherOfClass(classId, actor.userId));
    if (!isClassTeacher) {
      if (
        actor.role !== UserRole.InstituteManager &&
        actor.role !== UserRole.SuperAdmin
      ) {
        throw new ForbiddenError(
          'Only the manager or a class teacher can remove students',
        );
      }
      await this.policy.assertManagerOf(actor, klass.instituteId);
    }
    await this.classes.removeStudent(classId, studentId);
  }
}
