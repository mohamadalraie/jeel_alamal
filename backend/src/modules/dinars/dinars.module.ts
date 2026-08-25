import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { DinarsController } from './presentation/dinars.controller';
import {
  CreateManualRuleUseCase,
  DeleteManualRuleUseCase,
  GetDinarRulesUseCase,
  ListAwardableRulesUseCase,
  UpdateRuleUseCase,
} from './application/dinar-rules.use-cases';
import {
  AwardDinarUseCase,
  BulkAwardDinarUseCase,
  ReverseDinarUseCase,
} from './application/award-dinar.use-cases';
import { DinarAwardPolicy } from './application/dinar-award.policy';
import { GetStudentDinarsUseCase } from './application/student-dinars.use-cases';
import { GetDinarLeaderboardUseCase } from './application/leaderboard.use-case';
import { SyncAttendanceDinarsUseCase } from './application/sync-attendance-dinars.use-case';
import { ApplyRecitationDinarUseCase } from './application/apply-recitation-dinar.use-case';
import { DINAR_RULE_REPOSITORY } from './domain/dinar-rule.repository';
import { DINAR_TRANSACTION_REPOSITORY } from './domain/dinar-transaction.repository';
import { DrizzleDinarRuleRepository } from './infrastructure/persistence/drizzle-dinar-rule.repository';
import { DrizzleDinarTransactionRepository } from './infrastructure/persistence/drizzle-dinar-transaction.repository';

/**
 * Dinars (نظام الدنانير) — spec 010. Reuses USER_REPOSITORY, CLASS_REPOSITORY,
 * and InstituteAccessPolicy. The two sync use-cases are exported so the attendance
 * and recitation modules can feed automatic projections (one-way dependency).
 */
@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule],
  controllers: [DinarsController],
  providers: [
    GetDinarRulesUseCase,
    ListAwardableRulesUseCase,
    CreateManualRuleUseCase,
    UpdateRuleUseCase,
    DeleteManualRuleUseCase,
    DinarAwardPolicy,
    AwardDinarUseCase,
    BulkAwardDinarUseCase,
    ReverseDinarUseCase,
    GetStudentDinarsUseCase,
    GetDinarLeaderboardUseCase,
    SyncAttendanceDinarsUseCase,
    ApplyRecitationDinarUseCase,
    { provide: DINAR_RULE_REPOSITORY, useClass: DrizzleDinarRuleRepository },
    {
      provide: DINAR_TRANSACTION_REPOSITORY,
      useClass: DrizzleDinarTransactionRepository,
    },
  ],
  exports: [SyncAttendanceDinarsUseCase, ApplyRecitationDinarUseCase],
})
export class DinarsModule {}
