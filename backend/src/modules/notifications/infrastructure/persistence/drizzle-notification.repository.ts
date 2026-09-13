import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { NotificationItem } from '../../domain/notification.entity';
import type { NotificationRepository } from '../../domain/notification.repository';
import { notifications } from './notification.schema';

@Injectable()
export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(notification: NotificationItem): Promise<void> {
    await this.db.insert(notifications).values({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  }

  async saveMany(list: NotificationItem[]): Promise<void> {
    if (list.length === 0) return;
    await this.db.insert(notifications).values(
      list.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        link: n.link,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    );
  }

  async findByUser(userId: string, limit = 20): Promise<NotificationItem[]> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return rows.map((r) =>
      NotificationItem.reconstitute(r.id, {
        userId: r.userId,
        title: r.title,
        message: r.message,
        link: r.link,
        type: r.type,
        isRead: r.isRead,
        createdAt: r.createdAt,
      }),
    );
  }

  async countUnread(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      );
    return Number(row?.n ?? 0);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }
}
