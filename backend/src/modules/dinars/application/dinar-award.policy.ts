import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { ForbiddenError } from '../../../shared/domain/domain.error';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { User } from '../../users/domain/user.entity';

/**
 * Who may award/deduct dinars to a student (spec 010, FR-004/FR-008):
 * super_admin or the institute's manager → any student in that institute; a
 * teacher → only students in a class they teach. Students never award.
 */
@Injectable()
export class DinarAwardPolicy {
  constructor(
    private readonly access: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async assertCanAward(actor: Actor, student: User): Promise<void> {
    if (!student.instituteId) {
      throw new ForbiddenError('Student has no institute');
    }
    if (
      actor.role === UserRole.SuperAdmin ||
      actor.role === UserRole.InstituteManager
    ) {
      await this.access.assertManagerOf(actor, student.instituteId);
      return;
    }
    if (actor.role === UserRole.Teacher) {
      const klass = await this.classes.findCurrentClassOfStudent(student.id);
      if (
        klass &&
        klass.instituteId === actor.instituteId &&
        (await this.classes.isTeacherOfClass(klass.id, actor.userId))
      ) {
        return;
      }
    }
    throw new ForbiddenError('You may not award dinars to this student');
  }
}
