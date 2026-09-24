import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { Announcement } from '../../domain/announcement.entity';
import { ANNOUNCEMENT_REPOSITORY } from '../../domain/announcement.repository';
import type { AnnouncementRepository } from '../../domain/announcement.repository';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { AnnouncementResponseDto } from '../dto/announcement-response.dto';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';
import { NotificationsService } from '../../../notifications/application/notifications.service';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../../classes/domain/class.repository';
import type { ClassRepository } from '../../../classes/domain/class.repository';

@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repository: AnnouncementRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY)
    private readonly classes: ClassRepository,
    private readonly policy: InstituteAccessPolicy,
    private readonly notifications: NotificationsService,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateAnnouncementDto,
  ): Promise<AnnouncementResponseDto> {
    await this.policy.assertStaffOf(actor, instituteId);

    const announcement = Announcement.create({
      instituteId,
      authorId: actor.userId,
      targetHalkaId: dto.targetHalkaId || null,
      title: dto.title,
      content: dto.content,
      imageUrl: dto.imageUrl,
      targetTrack: dto.targetTrack,
    });

    await this.repository.save(announcement);

    try {
      let recipientIds: string[] = [];
      if (announcement.targetHalkaId) {
        const membership = await this.classes.getMembership(
          announcement.targetHalkaId,
        );
        recipientIds = [
          ...(membership?.teacherIds ?? []),
          ...(membership?.studentIds ?? []),
          ...(membership?.intensiveStudentIds ?? []),
          ...(membership?.supervisorId ? [membership.supervisorId] : []),
        ];
      } else {
        const instituteUsers = await this.users.findByInstitute(instituteId);
        if (announcement.targetTrack === 'intensive') {
          const intensiveIds = await this.classes.getIntensiveStudentIdsForInstitute(instituteId);
          const intensiveSet = new Set(intensiveIds);
          recipientIds = instituteUsers.filter(u => u.role !== 'student' || intensiveSet.has(u.id)).map(u => u.id);
        } else if (announcement.targetTrack === 'regular') {
          const intensiveIds = await this.classes.getIntensiveStudentIdsForInstitute(instituteId);
          const intensiveSet = new Set(intensiveIds);
          recipientIds = instituteUsers.filter(u => u.role !== 'student' || !intensiveSet.has(u.id)).map(u => u.id);
        } else {
          recipientIds = (instituteUsers ?? []).map((u) => u.id);
        }
      }

      const filteredRecipientIds = Array.from(new Set(recipientIds)).filter(
        (id) => id !== actor.userId,
      );

      await this.notifications.sendToUsers(filteredRecipientIds, {
        title: `إعلان جديد: ${announcement.title}`,
        message: announcement.content.slice(0, 100),
        type: 'announcement',
        link: '/dashboard/announcements',
      });
    } catch (err) {
      // Notification errors must not break announcement creation
    }

    return AnnouncementResponseDto.fromDomain(announcement);
  }
}
