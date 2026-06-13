import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { InstituteAccessPolicy } from '../institute-access.policy';

/**
 * Tenant-scoped member listing (teachers or students of one institute).
 * Permission: institute staff (assigned manager or its teachers).
 */
@Injectable()
export class ListMembersUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    role: UserRole.Teacher | UserRole.Student,
  ): Promise<UserResponseDto[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const members = await this.users.findByInstitute(instituteId, role);
    return members.map((m) => UserResponseDto.fromDomain(m));
  }
}
