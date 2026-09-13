import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';
import { DrizzleNotificationRepository } from './infrastructure/persistence/drizzle-notification.repository';
import { NotificationsService } from './application/notifications.service';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: DrizzleNotificationRepository,
    },
  ],
  exports: [NotificationsService, NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}
