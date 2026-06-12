import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { ForbiddenError } from '../../../shared/domain/domain.error';
import { MANAGER_ASSIGNMENTS } from '../domain/manager-assignment.repository';
import type { ManagerAssignmentRepository } from '../domain/manager-assignment.repository';

/**
 * Tenant-access policy (constitution II–III), reused by every module that
 * guards institute-scoped actions. Centralising the checks keeps the rules in
 * one reviewable place instead of scattered conditionals.
 */
@Injectable()
export class InstituteAccessPolicy {
  constructor(
    @Inject(MANAGER_ASSIGNMENTS)
    private readonly assignments: ManagerAssignmentRepository,
  ) {}

  /** Manager assigned to the institute. Everyone else is denied. */
  async assertManagerOf(actor: Actor, instituteId: string): Promise<void> {
    if (
      actor.role === UserRole.InstituteManager &&
      (await this.assignments.isAssigned(actor.userId, instituteId))
    ) {
      return;
    }
    throw new ForbiddenError('Not a manager of this institute');
  }

  /** Manager assigned to the institute OR teacher belonging to it. */
  async assertStaffOf(actor: Actor, instituteId: string): Promise<void> {
    if (actor.role === UserRole.Teacher && actor.instituteId === instituteId) {
      return;
    }
    if (
      actor.role === UserRole.InstituteManager &&
      (await this.assignments.isAssigned(actor.userId, instituteId))
    ) {
      return;
    }
    throw new ForbiddenError('Not staff of this institute');
  }
}
