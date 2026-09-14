import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE, type DrizzleDb } from '../../../core/database/drizzle.provider';
import { pushSubscriptions } from '../infrastructure/persistence/notification.schema';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    'BNpLIXaj8bbNnX3nkMgqP3Ma1_v6emPFQRwbkJ0nUHGjWngmlz2efBDvQX1beHwZ58PC5n8PYqL9dRSUlrvczzg';
  private readonly privateKey =
    process.env.VAPID_PRIVATE_KEY ||
    'UFWXudPjqzi30PZunJpr8KvFGZ4z8SSSSGO_uvwbYdw';
  private readonly subject =
    process.env.VAPID_SUBJECT || 'mailto:admin@jeel.almanshiah.io';

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  onModuleInit() {
    try {
      webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
    } catch (err) {
      console.warn('WebPush initialization warning:', err);
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    const existing = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

    if (existing.length > 0) {
      await this.db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      await this.db.insert(pushSubscriptions).values({
        id: randomUUID(),
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
    }
  }

  async sendPushNotification(
    userIds: string[],
    payload: {
      id?: string;
      title: string;
      message: string;
      link?: string;
      type?: string;
    },
  ): Promise<void> {
    if (userIds.length === 0) return;

    const subs = await this.db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));

    if (subs.length === 0) return;

    const jsonPayload = JSON.stringify({
      id: payload.id || randomUUID(),
      title: payload.title,
      message: payload.message,
      link: payload.link || '/',
      type: payload.type || 'general',
    });

    await Promise.all(
      subs.map(async (sub) => {
        const pushSubscription: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        try {
          await webpush.sendNotification(pushSubscription, jsonPayload);
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await this.db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.endpoint, sub.endpoint));
          }
        }
      }),
    );
  }
}
