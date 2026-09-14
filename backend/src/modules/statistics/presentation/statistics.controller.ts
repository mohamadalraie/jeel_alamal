import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { GetInstituteStatsUseCase } from '../application/get-institute-stats.use-case';
import {
  GetManagerAnalyticsUseCase,
  GetTeacherAnalyticsUseCase,
  GetStudentAnalyticsUseCase,
} from '../application/get-analytics.use-cases';

@Controller('institutes/:instituteId')
export class StatisticsController {
  constructor(
    private readonly getStats: GetInstituteStatsUseCase,
    private readonly getManagerAnalytics: GetManagerAnalyticsUseCase,
    private readonly getTeacherAnalytics: GetTeacherAnalyticsUseCase,
    private readonly getStudentAnalytics: GetStudentAnalyticsUseCase,
  ) {}

  @Get('stats')
  stats(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.getStats.execute(actor, instituteId);
  }

  @Get('analytics/manager')
  managerAnalytics(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.getManagerAnalytics.execute(actor, instituteId);
  }

  @Get('analytics/teacher')
  teacherAnalytics(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.getTeacherAnalytics.execute(actor, instituteId, teacherId);
  }

  @Get('analytics/student')
  studentAnalytics(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.getStudentAnalytics.execute(actor, instituteId, studentId);
  }
}
