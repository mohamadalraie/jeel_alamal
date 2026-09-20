import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import {
  TakeAttendanceUseCase,
  GetClassAttendanceUseCase,
  GetSessionUseCase,
  GetStudentAttendanceUseCase,
} from '../application/attendance.use-cases';
import { TakeAttendanceDto } from '../application/dto/attendance.dto';

@Controller()
export class AttendanceController {
  constructor(
    private readonly takeAttendance: TakeAttendanceUseCase,
    private readonly getClassAttendance: GetClassAttendanceUseCase,
    private readonly getSession: GetSessionUseCase,
    private readonly getStudentAttendance: GetStudentAttendanceUseCase,
  ) {}

  @Post('classes/:classId/attendance')
  @HttpCode(HttpStatus.CREATED)
  async take(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: TakeAttendanceDto,
  ) {
    await this.takeAttendance.execute(actor, classId, dto);
  }

  @Get('classes/:classId/attendance')
  classOverview(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.getClassAttendance.execute(actor, classId);
  }

  @Get('classes/:classId/attendance/:date')
  session(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('date') date: string,
    @Query('trackType') trackType?: 'regular' | 'intensive',
  ) {
    return this.getSession.execute(actor, classId, date, trackType ?? 'regular');
  }

  @Get('students/:studentId/attendance')
  student(
    @CurrentUser() actor: Actor,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.getStudentAttendance.execute(actor, studentId);
  }
}
