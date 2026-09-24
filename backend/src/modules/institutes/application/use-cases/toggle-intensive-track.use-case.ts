import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { NotFoundError } from '../../../../shared/domain/domain.error';
import { INSTITUTE_REPOSITORY } from '../../domain/institute.repository';
import type { InstituteRepository } from '../../domain/institute.repository';
import { InstituteAccessPolicy } from '../institute-access.policy';
import { InstituteResponseDto } from '../dto/institute-response.dto';

/** Toggle intensive track for an institute (assigned manager or super_admin). */
@Injectable()
export class ToggleIntensiveTrackUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(INSTITUTE_REPOSITORY)
    private readonly institutes: InstituteRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    enabled: boolean,
  ): Promise<InstituteResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);
    const institute = await this.institutes.findById(instituteId);
    if (!institute) throw new NotFoundError('Institute not found');
    institute.toggleIntensiveTrack(enabled);
    await this.institutes.save(institute);
    return InstituteResponseDto.fromDomain(institute);
  }
}
