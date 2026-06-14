import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import {
  ListSurahsUseCase,
  AddRecitationUseCase,
  GetStudentRecitationUseCase,
  GetClassRecitationUseCase,
} from '../application/recitation.use-cases';
import { AddRecitationDto } from '../application/dto/recitation.dto';

@Controller()
export class RecitationsController {
  constructor(
    private readonly listSurahs: ListSurahsUseCase,
    private readonly addRecitation: AddRecitationUseCase,
    private readonly getStudentRecitation: GetStudentRecitationUseCase,
    private readonly getClassRecitation: GetClassRecitationUseCase,
  ) {}

  /** Reference list of the 114 surahs (any authenticated user). */
  @Get('quran/surahs')
  surahs() {
    return this.listSurahs.execute();
  }

  @Post('students/:studentId/recitations')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser() actor: Actor,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: AddRecitationDto,
  ) {
    await this.addRecitation.execute(actor, studentId, dto);
  }

  @Get('students/:studentId/recitations')
  student(
    @CurrentUser() actor: Actor,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.getStudentRecitation.execute(actor, studentId);
  }

  @Get('classes/:classId/recitations')
  classLog(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.getClassRecitation.execute(actor, classId);
  }
}
