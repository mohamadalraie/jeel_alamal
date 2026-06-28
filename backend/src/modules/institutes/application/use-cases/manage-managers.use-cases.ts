import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { BusinessRuleError } from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { CreateUserAccountUseCase } from '../../../users/application/use-cases/create-user-account.use-case';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { CreateTeacherDto } from '../dto/create-member.dto';
import { InstituteAccessPolicy } from '../institute-access.policy';
import { MANAGER_ASSIGNMENTS } from '../../domain/manager-assignment.repository';
import type { ManagerAssignmentRepository } from '../../domain/manager-assignment.repository';

/**
 * Add an additional manager to an institute (an institute may have several).
 * Creates the account (role manager, no single home institute — managers are
 * M:N) and assigns it. Permission: an assigned manager or the super admin.
 */
@Injectable()
export class AddManagerUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    private readonly createUserAccount: CreateUserAccountUseCase,
    @Inject(MANAGER_ASSIGNMENTS)
    private readonly assignments: ManagerAssignmentRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateTeacherDto,
  ): Promise<UserResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);
    const manager = await this.createUserAccount.execute({
      ...dto,
      role: UserRole.InstituteManager,
      instituteId: null,
    });
    await this.assignments.assign(manager.id, instituteId);
    return UserResponseDto.fromDomain(manager);
  }
}

/** List the managers assigned to an institute. Permission: institute staff. */
@Injectable()
export class ListManagersUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MANAGER_ASSIGNMENTS)
    private readonly assignments: ManagerAssignmentRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<UserResponseDto[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const ids = await this.assignments.findManagerIdsByInstitute(instituteId);
    const managers = await this.users.findManyByIds(ids); // filters soft-deleted
    return managers.map((m) => UserResponseDto.fromDomain(m));
  }
}

/**
 * Remove a manager from an institute (un-assign). The institute must keep at
 * least one manager (spec 001 FR-2). Permission: an assigned manager or super
 * admin.
 */
@Injectable()
export class RemoveManagerUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(MANAGER_ASSIGNMENTS)
    private readonly assignments: ManagerAssignmentRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    managerId: string,
  ): Promise<void> {
    await this.policy.assertManagerOf(actor, instituteId);
    const count = await this.assignments.countManagers(instituteId);
    if (count <= 1) {
      throw new BusinessRuleError('The institute must keep at least one manager');
    }
    await this.assignments.unassign(managerId, instituteId);
  }
}
