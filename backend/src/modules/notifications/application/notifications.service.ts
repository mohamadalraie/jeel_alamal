import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from '../domain/notification.repository';
import type { NotificationRepository } from '../domain/notification.repository';
import { NotificationItem } from '../domain/notification.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: NotificationRepository,
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
