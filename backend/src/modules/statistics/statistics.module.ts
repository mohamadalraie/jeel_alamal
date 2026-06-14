import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { StatisticsController } from './presentation/statistics.controller';
import { GetInstituteStatsUseCase } from './application/get-institute-stats.use-case';

/**
 * Institute statistics (spec 004). Reuses repositories + the access policy
 * exported by the users, classes, and institutes modules.
 */
@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule],
  controllers: [StatisticsController],
  providers: [GetInstituteStatsUseCase],
})
export class StatisticsModule {}
