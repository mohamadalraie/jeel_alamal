import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { GetInstituteStatsUseCase } from '../application/get-institute-stats.use-case';
import {
  GetManagerAnalyticsUseCase,
  GetTeacherAnalyticsUseCase,
  GetStudentAnalyticsUseCase,
} from '../application/get-analytics.use-cases';
import { GetStudentsAchievementReportUseCase } from '../application/get-students-achievement-report.use-case';

@Controller('institutes/:instituteId')
export class StatisticsController {
  constructor(
    private readonly getStats: GetInstituteStatsUseCase,
    private readonly getManagerAnalytics: GetManagerAnalyticsUseCase,
    private readonly getTeacherAnalytics: GetTeacherAnalyticsUseCase,
    private readonly getStudentAnalytics: GetStudentAnalyticsUseCase,
    private readonly getStudentsAchievementReport: GetStudentsAchievementReportUseCase,
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

  @Get('reports/students-achievement')
  studentsAchievementReport(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('classId') classId?: string,
    @Query('track') track?: 'all' | 'regular' | 'intensive',
  ) {
    return this.getStudentsAchievementReport.execute(actor, instituteId, {
      startDate,
      endDate,
      classId,
      track,
    });
  }
}
