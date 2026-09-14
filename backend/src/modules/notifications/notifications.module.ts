import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';
import { DrizzleNotificationRepository } from './infrastructure/persistence/drizzle-notification.repository';
import { NotificationsService } from './application/notifications.service';
import { WebPushService } from './application/web-push.service';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WebPushService,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: DrizzleNotificationRepository,
    },
  ],
  exports: [NotificationsService, WebPushService, NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}
