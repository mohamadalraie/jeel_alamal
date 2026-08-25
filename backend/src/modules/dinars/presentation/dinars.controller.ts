import {
  Body,
  Controller,
  Delete,
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
import {
  CreateManualRuleUseCase,
  DeleteManualRuleUseCase,
  GetDinarRulesUseCase,
  ListAwardableRulesUseCase,
  UpdateRuleUseCase,
} from '../application/dinar-rules.use-cases';
import {
  AwardDinarUseCase,
  BulkAwardDinarUseCase,
  ReverseDinarUseCase,
} from '../application/award-dinar.use-cases';
import { GetStudentDinarsUseCase } from '../application/student-dinars.use-cases';
import { GetDinarLeaderboardUseCase } from '../application/leaderboard.use-case';
import {
  AwardDinarDto,
  BulkAwardDinarDto,
  CreateRuleDto,
  UpdateRuleDto,
} from '../application/dto/dinar.dto';

@Controller()
export class DinarsController {
  constructor(
    private readonly getRules: GetDinarRulesUseCase,
    private readonly listAwardable: ListAwardableRulesUseCase,
    private readonly createRule: CreateManualRuleUseCase,
    private readonly updateRule: UpdateRuleUseCase,
    private readonly deleteRule: DeleteManualRuleUseCase,
    private readonly award: AwardDinarUseCase,
    private readonly bulkAward: BulkAwardDinarUseCase,
    private readonly reverse: ReverseDinarUseCase,
    private readonly getStudentDinars: GetStudentDinarsUseCase,
    private readonly getLeaderboard: GetDinarLeaderboardUseCase,
  ) {}

  // ── Rules (manager) ──

  @Get('institutes/:instituteId/dinar-rules')
  rules(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.getRules.execute(actor, instituteId);
  }

  @Get('institutes/:instituteId/dinar-rules/awardable')
  awardable(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listAwardable.execute(actor, instituteId);
  }

  @Post('institutes/:instituteId/dinar-rules')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateRuleDto,
  ) {
    return this.createRule.execute(actor, instituteId, dto);
  }

  @Patch('dinar-rules/:ruleId')
  update(
    @CurrentUser() actor: Actor,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.updateRule.execute(actor, ruleId, dto);
  }

  @Delete('dinar-rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actor: Actor,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    await this.deleteRule.execute(actor, ruleId);
  }

  // ── Awarding (teacher / manager) ──

  @Post('students/:studentId/dinars')
  @HttpCode(HttpStatus.CREATED)
  awardOne(
    @CurrentUser() actor: Actor,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: AwardDinarDto,
  ) {
    return this.award.execute(actor, studentId, dto);
  }

  @Post('dinars/bulk')
  @HttpCode(HttpStatus.CREATED)
  awardBulk(@CurrentUser() actor: Actor, @Body() dto: BulkAwardDinarDto) {
    return this.bulkAward.execute(actor, dto);
  }

  @Post('dinars/:transactionId/reverse')
  @HttpCode(HttpStatus.CREATED)
  reverseOne(
    @CurrentUser() actor: Actor,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.reverse.execute(actor, transactionId);
  }

  // ── Student view ──

  @Get('students/:studentId/dinars')
  student(
    @CurrentUser() actor: Actor,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.getStudentDinars.execute(actor, studentId);
  }

  // ── Leaderboard (staff) ──

  @Get('institutes/:instituteId/dinar-leaderboard')
  leaderboard(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('classId') classId?: string,
  ) {
    return this.getLeaderboard.execute(
      actor,
      instituteId,
      classId || undefined,
    );
  }
}
