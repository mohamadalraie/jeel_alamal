import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { ForbiddenError } from '../../../shared/domain/domain.error';
import { MANAGER_ASSIGNMENTS } from '../../institutes/domain/manager-assignment.repository';
import type { ManagerAssignmentRepository } from '../../institutes/domain/manager-assignment.repository';

/**
 * Access rules for profile data (spec 002). Unlike the spec-001 institute
 * policy, super_admin is allowed everywhere here — viewing/editing teacher and
 * student data is part of platform administration.
 */
@Injectable()
export class ProfileAccessPolicy {
  constructor(
    @Inject(MANAGER_ASSIGNMENTS)
    private readonly assignments: ManagerAssignmentRepository,
  ) {}

  private async isAssignedManager(actor: Actor, instituteId: string) {
    return (
      actor.role === UserRole.InstituteManager &&
      (await this.assignments.isAssigned(actor.userId, instituteId))
    );
  }

  /** Teacher EXTENDED details & deletion: super_admin or assigned manager. */
  async assertManagesInstitute(
    actor: Actor,
    instituteId: string,
  ): Promise<void> {
    if (actor.role === UserRole.SuperAdmin) return;
    if (await this.isAssignedManager(actor, instituteId)) return;
    throw new ForbiddenError('Requires manager or super admin');
  }

  /** Student data & notes: super_admin, assigned manager, or teacher of institute. */
  async assertStaffOfInstitute(
    actor: Actor,
    instituteId: string,
  ): Promise<void> {
    if (actor.role === UserRole.SuperAdmin) return;
    if (actor.role === UserRole.Teacher && actor.instituteId === instituteId) {
      return;
    }
    if (await this.isAssignedManager(actor, instituteId)) return;
    throw new ForbiddenError('Requires institute staff');
  }

  /** May the actor see a teacher's BASIC info (incl. the teacher themselves)? */
  async assertCanViewTeacherBasic(
    actor: Actor,
    instituteId: string,
    teacherId: string,
  ): Promise<void> {
    if (actor.role === UserRole.Teacher && actor.userId === teacherId) return;
    await this.assertManagesInstitute(actor, instituteId);
  }

  /** Only manager/super_admin may see/edit a teacher's EXTENDED details. */
  canSeeTeacherDetails(actor: Actor): boolean {
    return (
      actor.role === UserRole.SuperAdmin ||
      actor.role === UserRole.InstituteManager
    );
  }
}
