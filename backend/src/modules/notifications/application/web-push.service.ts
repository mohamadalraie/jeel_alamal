import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE, type DrizzleDb } from '../../../core/database/drizzle.provider';
import { pushSubscriptions } from '../infrastructure/persistence/notification.schema';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger('WebPush');
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
      this.logger.log('✅ VAPID details set successfully');
    } catch (err) {
      this.logger.error('❌ VAPID initialization failed:', err);
    }
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    try {
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
        this.logger.log(`Push subscription updated for user ${userId}`);
      } else {
        await this.db.insert(pushSubscriptions).values({
          id: randomUUID(),
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        });
        this.logger.log(`Push subscription saved for user ${userId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to save push subscription for user ${userId}:`, err);
      throw err;
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

    let subs: any[];
    try {
      subs = await this.db
        .select()
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.userId, userIds));
    } catch (err) {
      this.logger.error('❌ Failed to query push_subscriptions table:', err);
      return;
    }

    if (subs.length === 0) {
      this.logger.warn(`No push subscriptions found for ${userIds.length} user(s) — push skipped`);
      return;
    }

    this.logger.log(`Sending push to ${subs.length} subscription(s) for ${userIds.length} user(s)`);

    const jsonPayload = JSON.stringify({
      id: payload.id || randomUUID(),
      title: payload.title,
      message: payload.message,
      link: payload.link || '/',
      type: payload.type || 'general',
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSubscription: webpush.PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        try {
          await webpush.sendNotification(pushSubscription, jsonPayload, {
            urgency: 'high',
            TTL: 86400, // 24 hours
            headers: {
              Urgency: 'high',
            },
          });
          this.logger.log(`✅ Push sent to ${sub.endpoint.slice(-20)}`);
        } catch (err: any) {
          this.logger.error(
            `❌ Push failed (${err?.statusCode || 'unknown'}): ${err?.body || err?.message || err}`,
          );
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await this.db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.endpoint, sub.endpoint));
            this.logger.warn(`Removed stale subscription: ${sub.endpoint.slice(-20)}`);
          }
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`Push delivery: ${succeeded}/${subs.length} succeeded`);
  }
}
