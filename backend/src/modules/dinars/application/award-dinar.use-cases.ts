import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { User } from '../../users/domain/user.entity';
import { DinarContext } from '../domain/dinar-context';
import { DinarRule } from '../domain/dinar-rule.entity';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import {
  DINAR_RULE_REPOSITORY,
  type DinarRuleRepository,
} from '../domain/dinar-rule.repository';
import {
  DINAR_TRANSACTION_REPOSITORY,
  type DinarTransactionRepository,
} from '../domain/dinar-transaction.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { DinarAwardPolicy } from './dinar-award.policy';
import { toLedgerItem } from './dinar-mappers';
import {
  AwardDinarDto,
  BulkAwardDinarDto,
  DinarLedgerItem,
} from './dto/dinar.dto';

/** Resolve and validate the manual rule referenced by an award. */
async function resolveActiveRule(
  rules: DinarRuleRepository,
  ruleId: string,
  instituteId: string,
): Promise<DinarRule> {
  const rule = await rules.findById(ruleId);
  if (!rule || rule.instituteId !== instituteId) {
    throw new NotFoundError('Rule not found');
  }
  if (!rule.isActive) throw new BusinessRuleError('Rule is not active');
  return rule;
}

/** Build one manual transaction (rule or exceptional) from an award payload. */
function buildAward(
  dto: AwardDinarDto,
  student: User,
  rule: DinarRule | null,
  actor: Actor,
): DinarTransaction {
  const context = dto.context ?? DinarContext.General;
  if (rule) {
    return DinarTransaction.awardRule({
      instituteId: student.instituteId!,
      studentId: student.id,
      rule,
      context,
      awardedBy: actor.userId,
    });
  }
  if (dto.amount !== undefined && dto.reason !== undefined) {
    return DinarTransaction.awardExceptional({
      instituteId: student.instituteId!,
      studentId: student.id,
      amount: dto.amount,
      reason: dto.reason,
      context,
      awardedBy: actor.userId,
    });
  }
  throw new BusinessRuleError('Provide a rule, or an amount with a reason');
}

async function loadStudent(
  users: UserRepository,
  studentId: string,
): Promise<User> {
  const student = await users.findById(studentId);
  if (!student || student.role !== UserRole.Student || !student.instituteId) {
    throw new NotFoundError('Student not found');
  }
  return student;
}

/** Award dinars to a single student (rule or exceptional). Teacher/manager. */
@Injectable()
export class AwardDinarUseCase {
  constructor(
    private readonly awardPolicy: DinarAwardPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(
    actor: Actor,
    studentId: string,
    dto: AwardDinarDto,
  ): Promise<DinarLedgerItem> {
    const student = await loadStudent(this.users, studentId);
    await this.awardPolicy.assertCanAward(actor, student);
    const rule = dto.ruleId
      ? await resolveActiveRule(this.rules, dto.ruleId, student.instituteId!)
      : null;
    const txn = buildAward(dto, student, rule, actor);
    await this.txns.save(txn);
    const actorUser = await this.users.findById(actor.userId);
    return toLedgerItem(txn, () => actorUser?.fullName ?? '—');
  }
}

/** Award one rule (or exceptional) to many students at once. Teacher/manager. */
@Injectable()
export class BulkAwardDinarUseCase {
  constructor(
    private readonly awardPolicy: DinarAwardPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(
    actor: Actor,
    dto: BulkAwardDinarDto,
  ): Promise<{ awarded: number }> {
    const ids = [...new Set(dto.studentIds)];
    const students = await this.users.findManyByIds(ids);
    if (students.length !== ids.length) {
      throw new NotFoundError('One or more students not found');
    }
    for (const student of students) {
      if (student.role !== UserRole.Student || !student.instituteId) {
        throw new NotFoundError('One or more students not found');
      }
      await this.awardPolicy.assertCanAward(actor, student);
    }
    // All students share the same institute (enforced by the per-student policy).
    const instituteId = students[0].instituteId!;
    const rule = dto.ruleId
      ? await resolveActiveRule(this.rules, dto.ruleId, instituteId)
      : null;
    const built = students.map((student) =>
      buildAward(dto, student, rule, actor),
    );
    await this.txns.saveMany(built);
    return { awarded: built.length };
  }
}

/** Reverse a manual award (author or manager) with a compensating entry. */
@Injectable()
export class ReverseDinarUseCase {
  constructor(
    private readonly access: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(actor: Actor, transactionId: string): Promise<DinarLedgerItem> {
    const original = await this.txns.findById(transactionId);
    if (!original) throw new NotFoundError('Transaction not found');

    const isAuthor = original.awardedBy === actor.userId;
    const isManager =
      actor.role === UserRole.SuperAdmin ||
      actor.role === UserRole.InstituteManager;
    if (!isAuthor && !isManager) {
      throw new ForbiddenError('Only the author or a manager may reverse this');
    }
    if (isManager && !isAuthor) {
      await this.access.assertManagerOf(actor, original.instituteId);
    }

    const reversal = DinarTransaction.reversalOf(original, actor.userId); // guards
    await this.txns.save(reversal);
    await this.txns.markReversed(original.id, new Date());
    const actorUser = await this.users.findById(actor.userId);
    return toLedgerItem(reversal, () => actorUser?.fullName ?? '—');
  }
}
