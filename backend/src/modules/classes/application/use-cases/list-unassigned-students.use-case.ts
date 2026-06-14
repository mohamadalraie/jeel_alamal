import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';

/**
 * Students of the institute not enrolled in any class — the candidate list for
 * the "add student to class" picker (one-class rule, spec 004).
 */
@Injectable()
export class ListUnassignedStudentsUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<UserResponseDto[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const ids = await this.classes.findStudentIdsWithoutClass(instituteId);
    const students = await this.users.findManyByIds(ids);
    return students.map((s) => UserResponseDto.fromDomain(s));
  }
}
