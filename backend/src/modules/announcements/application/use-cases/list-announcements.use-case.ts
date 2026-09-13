import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { ANNOUNCEMENT_REPOSITORY } from '../../domain/announcement.repository';
import type { AnnouncementRepository } from '../../domain/announcement.repository';
import { AnnouncementResponseDto } from '../dto/announcement-response.dto';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repository: AnnouncementRepository,
    private readonly policy: InstituteAccessPolicy,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
  ): Promise<AnnouncementResponseDto[]> {
    await this.policy.assertMemberOf(actor, instituteId);
    const list = await this.repository.findByInstitute(instituteId);
    return list.map((item) => AnnouncementResponseDto.fromDomain(item));
  }
}
