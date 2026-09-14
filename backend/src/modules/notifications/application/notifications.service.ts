import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from '../domain/notification.repository';
import type { NotificationRepository } from '../domain/notification.repository';
import { NotificationItem } from '../domain/notification.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
    private readonly webPushService: WebPushService,
  ) {}

  async sendToUser(input: {
    userId: string;
    title: string;
    message: string;
    link?: string;
    type?: string;
  }): Promise<void> {
    const item = NotificationItem.create(input);
    await this.repository.save(item);
    // Send background Web Push notification
    this.webPushService.sendPushNotification([input.userId], input).catch((err) => {
      console.warn('Background web push failed:', err);
    });
  }

  async sendToUsers(
    userIds: string[],
    input: {
      title: string;
      message: string;
      link?: string;
      type?: string;
    },
  ): Promise<void> {
    if (userIds.length === 0) return;
    const items = userIds.map((userId) =>
      NotificationItem.create({
        userId,
        title: input.title,
        message: input.message,
        link: input.link,
        type: input.type,
      }),
    );
    await this.repository.saveMany(items);
    // Send background Web Push notification to all target users
    this.webPushService.sendPushNotification(userIds, input).catch((err) => {
      console.warn('Background web push to many failed:', err);
    });
  }

  async getUserNotifications(
    userId: string,
    limit?: number,
  ): Promise<NotificationResponseDto[]> {
    const items = await this.repository.findByUser(userId, limit);
    return items.map((item) => NotificationResponseDto.fromDomain(item));
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.countUnread(userId);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.repository.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.markAllAsRead(userId);
  }
}
