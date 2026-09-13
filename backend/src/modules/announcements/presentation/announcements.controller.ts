import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { CreateAnnouncementUseCase } from '../application/use-cases/create-announcement.use-case';
import { ListAnnouncementsUseCase } from '../application/use-cases/list-announcements.use-case';
import { DeleteAnnouncementUseCase } from '../application/use-cases/delete-announcement.use-case';
import { CreateAnnouncementDto } from '../application/dto/create-announcement.dto';

@Controller('institutes/:instituteId/announcements')
export class AnnouncementsController {
  constructor(
    private readonly createAnnouncement: CreateAnnouncementUseCase,
    private readonly listAnnouncements: ListAnnouncementsUseCase,
    private readonly deleteAnnouncement: DeleteAnnouncementUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.createAnnouncement.execute(actor, instituteId, dto);
  }

  @Get()
  list(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listAnnouncements.execute(actor, instituteId);
  }

  @Delete(':announcementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('announcementId', ParseUUIDPipe) announcementId: string,
  ) {
    await this.deleteAnnouncement.execute(actor, instituteId, announcementId);
  }
}
