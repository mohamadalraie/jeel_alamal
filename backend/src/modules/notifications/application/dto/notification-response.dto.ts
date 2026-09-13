import { NotificationItem } from '../../domain/notification.entity';

export class NotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;

  static fromDomain(item: NotificationItem): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = item.id;
    dto.userId = item.userId;
    dto.title = item.title;
    dto.message = item.message;
    dto.link = item.link;
    dto.type = item.type;
    dto.isRead = item.isRead;
    dto.createdAt = item.createdAt.toISOString();
    return dto;
  }
}
