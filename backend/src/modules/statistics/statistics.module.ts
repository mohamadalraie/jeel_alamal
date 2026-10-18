import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { StatisticsController } from './presentation/statistics.controller';
import { GetInstituteStatsUseCase } from './application/get-institute-stats.use-case';
import {
  GetManagerAnalyticsUseCase,
  GetTeacherAnalyticsUseCase,
  GetStudentAnalyticsUseCase,
} from './application/get-analytics.use-cases';
import { GetStudentsAchievementReportUseCase } from './application/get-students-achievement-report.use-case';
import { ExportStudentsAchievementExcelUseCase } from './application/export-students-achievement-excel.use-case';

@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule],
  controllers: [StatisticsController],
  providers: [
    GetInstituteStatsUseCase,
    GetManagerAnalyticsUseCase,
    GetTeacherAnalyticsUseCase,
    GetStudentAnalyticsUseCase,
    GetStudentsAchievementReportUseCase,
    ExportStudentsAchievementExcelUseCase,
  ],
})
export class StatisticsModule {}
