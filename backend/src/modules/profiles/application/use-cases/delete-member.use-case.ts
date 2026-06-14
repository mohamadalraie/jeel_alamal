import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { NotFoundError } from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../../classes/domain/class.repository';
import type { ClassRepository } from '../../../classes/domain/class.repository';
import { ProfileAccessPolicy } from '../profile-access.policy';

/**
 * Soft-delete a teacher or student account (spec 004). Deleting a teacher
 * requires manager/super_admin; deleting a student is allowed for any institute
 * staff. The account row is preserved (authored notes keep their author), but
 * the user is detached from all classes and hidden everywhere.
 */
@Injectable()
export class DeleteMemberUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    memberId: string,
  ): Promise<void> {
    const member = await this.users.findById(memberId);
    if (
      !member ||
      member.instituteId !== instituteId ||
      (member.role !== UserRole.Teacher && member.role !== UserRole.Student)
    ) {
      throw new NotFoundError('Member not found in this institute');
    }

    if (member.role === UserRole.Teacher) {
      await this.policy.assertManagesInstitute(actor, instituteId);
    } else {
      await this.policy.assertStaffOfInstitute(actor, instituteId);
    }
    await this.classes.removeMemberFromAllClasses(memberId);
    await this.users.delete(memberId);
  }
}
