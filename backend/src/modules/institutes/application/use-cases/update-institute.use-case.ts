import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { NotFoundError } from '../../../../shared/domain/domain.error';
import { INSTITUTE_REPOSITORY } from '../../domain/institute.repository';
import type { InstituteRepository } from '../../domain/institute.repository';
import { InstituteAccessPolicy } from '../institute-access.policy';
import { UpdateInstituteDto } from '../dto/update-institute.dto';
import { InstituteResponseDto } from '../dto/institute-response.dto';

/** Edit an institute's details/logo (assigned manager or super_admin). */
@Injectable()
export class UpdateInstituteUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(INSTITUTE_REPOSITORY)
    private readonly institutes: InstituteRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: UpdateInstituteDto,
  ): Promise<InstituteResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);
    const institute = await this.institutes.findById(instituteId);
    if (!institute) throw new NotFoundError('Institute not found');
    institute.edit({
      name: dto.name,
      place: dto.place,
      description: dto.description,
      logoUrl: dto.logoUrl,
    });
    await this.institutes.save(institute);
    return InstituteResponseDto.fromDomain(institute);
  }
}
