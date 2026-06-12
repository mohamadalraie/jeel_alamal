import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { ForbiddenError } from '../../../../shared/domain/domain.error';
import { INSTITUTE_REPOSITORY } from '../../domain/institute.repository';
import type { InstituteRepository } from '../../domain/institute.repository';
import { InstituteResponseDto } from '../dto/institute-response.dto';

/**
 * super_admin sees all institutes; a manager sees only the institutes assigned
 * to them. Other roles are denied (deny by default, spec 001 matrix).
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
    throw new ForbiddenError('Not allowed to list institutes');
  }
}
