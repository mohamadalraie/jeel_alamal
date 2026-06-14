import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { GetInstituteStatsUseCase } from '../application/get-institute-stats.use-case';

@Controller('institutes/:instituteId')
export class StatisticsController {
  constructor(private readonly getStats: GetInstituteStatsUseCase) {}

  @Get('stats')
  stats(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.getStats.execute(actor, instituteId);
  }
}
