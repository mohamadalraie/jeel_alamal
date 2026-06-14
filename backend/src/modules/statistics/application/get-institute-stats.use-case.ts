import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { MANAGER_ASSIGNMENTS } from '../../institutes/domain/manager-assignment.repository';
import type { ManagerAssignmentRepository } from '../../institutes/domain/manager-assignment.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';

export interface InstituteStats {
  employees: number; // managers of the institute
  teachers: number;
  students: number;
  classes: number;
}

/**
 * Institute statistics (spec 004). The landing dashboard — kept intentionally
 * small for now, designed to grow. Readable by any institute staff.
 */
@Injectable()
export class GetInstituteStatsUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(MANAGER_ASSIGNMENTS)
    private readonly assignments: ManagerAssignmentRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<InstituteStats> {
    await this.policy.assertStaffOf(actor, instituteId);
    const [employees, teachers, students, classes] = await Promise.all([
      this.assignments.countManagers(instituteId),
      this.users.countByInstitute(instituteId, UserRole.Teacher),
      this.users.countByInstitute(instituteId, UserRole.Student),
      this.classes.countClasses(instituteId),
    ]);
    return { employees, teachers, students, classes };
  }
}
