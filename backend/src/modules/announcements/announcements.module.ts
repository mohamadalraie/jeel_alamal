import { Module } from '@nestjs/common';
import { ANNOUNCEMENT_REPOSITORY } from './domain/announcement.repository';
import { DrizzleAnnouncementRepository } from './infrastructure/persistence/drizzle-announcement.repository';
import { CreateAnnouncementUseCase } from './application/use-cases/create-announcement.use-case';
import { ListAnnouncementsUseCase } from './application/use-cases/list-announcements.use-case';
import { DeleteAnnouncementUseCase } from './application/use-cases/delete-announcement.use-case';
import { AnnouncementsController } from './presentation/announcements.controller';
import { InstitutesModule } from '../institutes/institutes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';

@Module({
  imports: [InstitutesModule, NotificationsModule, UsersModule, ClassesModule],
  controllers: [AnnouncementsController],
  providers: [
    CreateAnnouncementUseCase,
    ListAnnouncementsUseCase,
    DeleteAnnouncementUseCase,
    {
      provide: ANNOUNCEMENT_REPOSITORY,
      useClass: DrizzleAnnouncementRepository,
    },
  ],
  exports: [ANNOUNCEMENT_REPOSITORY],
})
export class AnnouncementsModule {}
