import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import {
  ConflictError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { DinarRule } from '../domain/dinar-rule.entity';
import {
  DINAR_RULE_REPOSITORY,
  type DinarRuleRepository,
} from '../domain/dinar-rule.repository';
import {
  DINAR_TRANSACTION_REPOSITORY,
  type DinarTransactionRepository,
} from '../domain/dinar-transaction.repository';
import { SYSTEM_RULE_KEYS } from '../domain/system-rule-keys';
import {
  CreateRuleDto,
  DinarRuleView,
  DinarRulesView,
  UpdateRuleDto,
} from './dto/dinar.dto';

export const toRuleView = (r: DinarRule): DinarRuleView => ({
  id: r.id,
  name: r.name,
  amount: r.amount,
  context: r.context,
  trigger: r.trigger,
  systemKey: r.systemKey,
  isActive: r.isActive,
  isProtected: r.isProtected,
  createdAt: r.createdAt.toISOString(),
});

const SYSTEM_ORDER = new Map(SYSTEM_RULE_KEYS.map((k, i) => [k, i]));

/** Full rule catalogue for the manager settings screen. Lazily seeds system rules. */
@Injectable()
export class GetDinarRulesUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<DinarRulesView> {
    await this.policy.assertManagerOf(actor, instituteId);
    await this.rules.seedSystemRules(instituteId);
    const [manual, system] = await Promise.all([
      this.rules.findManualByInstitute(instituteId),
      this.rules.findSystemByInstitute(instituteId),
    ]);
    return {
      manual: manual
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(toRuleView),
      system: system
        .sort(
          (a, b) =>
            (SYSTEM_ORDER.get(a.systemKey ?? '') ?? 0) -
            (SYSTEM_ORDER.get(b.systemKey ?? '') ?? 0),
        )
        .map(toRuleView),
    };
  }
}

/** Active manual rules a teacher/manager may award. Staff only. */
@Injectable()
export class ListAwardableRulesUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<DinarRuleView[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const manual = await this.rules.findManualByInstitute(instituteId);
    return manual
      .filter((r) => r.isActive)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toRuleView);
  }
}

/** Create a manual rule (lesson | recitation). Manager only. */
@Injectable()
export class CreateManualRuleUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateRuleDto,
  ): Promise<DinarRuleView> {
    await this.policy.assertManagerOf(actor, instituteId);
    const rule = DinarRule.create({
      instituteId,
      name: dto.name,
      amount: dto.amount,
      context: dto.context,
    });
    await this.rules.save(rule);
    return toRuleView(rule);
  }
}

/** Rename / re-value / (de)activate a rule. Manager only. */
@Injectable()
export class UpdateRuleUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
  ) {}

  async execute(
    actor: Actor,
    ruleId: string,
    dto: UpdateRuleDto,
  ): Promise<DinarRuleView> {
    const rule = await this.rules.findById(ruleId);
    if (!rule) throw new NotFoundError('Rule not found');
    await this.policy.assertManagerOf(actor, rule.instituteId);
    if (dto.name !== undefined) rule.rename(dto.name); // throws on protected
    if (dto.amount !== undefined) rule.setAmount(dto.amount);
    if (dto.isActive !== undefined) rule.setActive(dto.isActive);
    await this.rules.save(rule);
    return toRuleView(rule);
  }
}

/** Delete a manual rule (blocked if protected or has history). Manager only. */
@Injectable()
export class DeleteManualRuleUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(actor: Actor, ruleId: string): Promise<void> {
    const rule = await this.rules.findById(ruleId);
    if (!rule) throw new NotFoundError('Rule not found');
    await this.policy.assertManagerOf(actor, rule.instituteId);
    rule.assertDeletable(); // throws on protected
    if (await this.txns.existsForRule(ruleId)) {
      throw new ConflictError(
        'Rule has award history and cannot be deleted; deactivate it instead',
      );
    }
    await this.rules.delete(ruleId);
  }
}
