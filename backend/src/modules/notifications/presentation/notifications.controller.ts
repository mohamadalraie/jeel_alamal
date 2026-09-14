import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { NotificationsService } from '../application/notifications.service';
import { WebPushService } from '../application/web-push.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly webPushService: WebPushService,
  ) {}

  @Get()
  getNotifications(
    @CurrentUser() actor: Actor,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.notificationsService.getUserNotifications(
      actor.userId,
      limitNum,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() actor: Actor) {
    const count = await this.notificationsService.getUnreadCount(actor.userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @CurrentUser() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.markAsRead(id, actor.userId);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@CurrentUser() actor: Actor) {
    await this.notificationsService.markAllAsRead(actor.userId);
  }

  @Post('push-subscription')
  @HttpCode(HttpStatus.NO_CONTENT)
  async savePushSubscription(
    @CurrentUser() actor: Actor,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    await this.webPushService.saveSubscription(actor.userId, body);
  }
}
