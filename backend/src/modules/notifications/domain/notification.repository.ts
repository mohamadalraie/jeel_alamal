import { NotificationItem } from './notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRepository {
  save(notification: NotificationItem): Promise<void>;
  saveMany(notifications: NotificationItem[]): Promise<void>;
  findByUser(userId: string, limit?: number): Promise<NotificationItem[]>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
