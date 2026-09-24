import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { InstituteAccessPolicy } from '../institute-access.policy';
import { CLASS_REPOSITORY } from '../../../classes/domain/class.repository';
import type { ClassRepository } from '../../../classes/domain/class.repository';

/**
 * Tenant-scoped member listing (teachers or students of one institute).
 * Permission: institute staff (assigned manager or its teachers).
 */
@Injectable()
export class ListMembersUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    role: UserRole.Teacher | UserRole.Student,
  ): Promise<(UserResponseDto & { isIntensive?: boolean })[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const members = await this.users.findByInstitute(instituteId, role);
    if (role === UserRole.Student) {
      const intensiveIds = new Set(
        await this.classes.getIntensiveStudentIdsForInstitute(instituteId),
      );
      return members.map((m) => {
        const dto = UserResponseDto.fromDomain(m) as UserResponseDto & { isIntensive?: boolean };
        dto.isIntensive = intensiveIds.has(m.id);
        return dto;
      });
    }
    return members.map((m) => UserResponseDto.fromDomain(m));
  }
}
