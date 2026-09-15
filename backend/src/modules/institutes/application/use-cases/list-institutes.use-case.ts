import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { INSTITUTE_REPOSITORY } from '../../domain/institute.repository';
import type { InstituteRepository } from '../../domain/institute.repository';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { InstituteResponseDto } from '../dto/institute-response.dto';

/**
 * Institutes the actor may operate within (drives the topbar picker):
 * - super_admin: all institutes
 * - manager: the institutes assigned to them
 * - teacher/student: all institutes they belong to
 */
@Injectable()
export class ListInstitutesUseCase {
  constructor(
    @Inject(INSTITUTE_REPOSITORY)
    private readonly institutes: InstituteRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  async execute(actor: Actor): Promise<InstituteResponseDto[]> {
    if (actor.role === UserRole.SuperAdmin) {
      const all = await this.institutes.findAll();
      return all.map(InstituteResponseDto.fromDomain);
    }
    if (actor.role === UserRole.InstituteManager) {
      const mine = await this.institutes.findAllByManager(actor.userId);
      const userInstituteIds = await this.users.findInstituteIdsByUser(actor.userId);
      const userInsts = userInstituteIds.length > 0 ? await this.institutes.findManyByIds(userInstituteIds) : [];
      const combined = Array.from(
        new Map([...mine, ...userInsts].map((i) => [i.id, i])).values(),
      );
      return combined.map(InstituteResponseDto.fromDomain);
    }

    // teacher / student → all institutes they belong to
    const instituteIds = await this.users.findInstituteIdsByUser(actor.userId);
    if (instituteIds.length === 0 && actor.instituteId) {
      instituteIds.push(actor.instituteId);
    }
    const uniqueIds = Array.from(new Set(instituteIds));
    if (uniqueIds.length === 0) return [];
    const list = await this.institutes.findManyByIds(uniqueIds);
    return list.map(InstituteResponseDto.fromDomain);
  }
}
