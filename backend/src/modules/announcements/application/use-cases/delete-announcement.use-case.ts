import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { ANNOUNCEMENT_REPOSITORY } from '../../domain/announcement.repository';
import type { AnnouncementRepository } from '../../domain/announcement.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';
import { NotFoundError } from '../../../../shared/domain/domain.error';

@Injectable()
export class DeleteAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repository: AnnouncementRepository,
    private readonly policy: InstituteAccessPolicy,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    announcementId: string,
  ): Promise<void> {
    await this.policy.assertManagerOf(actor, instituteId);
    const existing = await this.repository.findById(announcementId);
    if (!existing || existing.instituteId !== instituteId) {
      throw new NotFoundError('Announcement not found');
    }
    await this.repository.delete(announcementId);
  }
}
