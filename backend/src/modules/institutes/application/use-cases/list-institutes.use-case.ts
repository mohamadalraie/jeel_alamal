import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { INSTITUTE_REPOSITORY } from '../../domain/institute.repository';
import type { InstituteRepository } from '../../domain/institute.repository';
import { InstituteResponseDto } from '../dto/institute-response.dto';

/**
 * Institutes the actor may operate within (drives the topbar picker):
 * - super_admin: all institutes
 * - manager: the institutes assigned to them
 * - teacher/student: their single home institute
 */
@Injectable()
export class ListInstitutesUseCase {
  constructor(
    @Inject(INSTITUTE_REPOSITORY)
    private readonly institutes: InstituteRepository,
  ) {}

  async execute(actor: Actor): Promise<InstituteResponseDto[]> {
    if (actor.role === UserRole.SuperAdmin) {
      const all = await this.institutes.findAll();
      return all.map(InstituteResponseDto.fromDomain);
    }
    if (actor.role === UserRole.InstituteManager) {
      const mine = await this.institutes.findAllByManager(actor.userId);
      return mine.map(InstituteResponseDto.fromDomain);
    }
    // teacher / student → their own institute
    if (actor.instituteId) {
      const inst = await this.institutes.findById(actor.instituteId);
      return inst ? [InstituteResponseDto.fromDomain(inst)] : [];
    }
    return [];
  }
}
