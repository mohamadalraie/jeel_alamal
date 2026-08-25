import {
  CreateManualRuleUseCase,
  DeleteManualRuleUseCase,
  GetDinarRulesUseCase,
  UpdateRuleUseCase,
} from './dinar-rules.use-cases';
import { DinarContext } from '../domain/dinar-context';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { SYSTEM_RULE_KEYS } from '../domain/system-rule-keys';
import {
  ConflictError,
  BusinessRuleError,
  ForbiddenError,
} from '../../../shared/domain/domain.error';
import {
  InMemoryRuleRepo,
  InMemoryTxnRepo,
  fakePolicy,
  managerActor,
  manualRule,
} from './dinars-test-fakes';

describe('Dinar rules use-cases (spec 010, US1)', () => {
  it('lazily seeds exactly the 9 system rules, idempotently', async () => {
    const rules = new InMemoryRuleRepo();
    const uc = new GetDinarRulesUseCase(fakePolicy({ manager: true }), rules);

    const first = await uc.execute(managerActor, 'inst-1');
    expect(first.system).toHaveLength(SYSTEM_RULE_KEYS.length);
    expect(first.system.every((r) => r.isProtected && !r.isActive)).toBe(true);

    await uc.execute(managerActor, 'inst-1');
    const system = await rules.findSystemByInstitute('inst-1');
    expect(system).toHaveLength(SYSTEM_RULE_KEYS.length);
  });

  it('rejects a zero-amount manual rule', async () => {
    const rules = new InMemoryRuleRepo();
    const uc = new CreateManualRuleUseCase(
      fakePolicy({ manager: true }),
      rules,
    );
    await expect(
      uc.execute(managerActor, 'inst-1', {
        name: 'x',
        amount: 0,
        context: DinarContext.Lesson,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('blocks non-managers from configuring rules', async () => {
    const rules = new InMemoryRuleRepo();
    const uc = new GetDinarRulesUseCase(fakePolicy({ manager: false }), rules);
    await expect(uc.execute(managerActor, 'inst-1')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('blocks deleting a rule that has history, allows one without', async () => {
    const rules = new InMemoryRuleRepo();
    const txns = new InMemoryTxnRepo();
    const used = rules.add(manualRule('inst-1', 'used', 5));
    const unused = rules.add(manualRule('inst-1', 'unused', 5));
    await txns.save(
      DinarTransaction.awardRule({
        instituteId: 'inst-1',
        studentId: 's1',
        rule: used,
        context: DinarContext.Lesson,
        awardedBy: 'tch-1',
      }),
    );
    const uc = new DeleteManualRuleUseCase(
      fakePolicy({ manager: true }),
      rules,
      txns,
    );

    await expect(uc.execute(managerActor, used.id)).rejects.toBeInstanceOf(
      ConflictError,
    );
    await uc.execute(managerActor, unused.id);
    expect(await rules.findById(unused.id)).toBeNull();
  });

  it('refuses to delete or rename a protected system rule', async () => {
    const rules = new InMemoryRuleRepo();
    await rules.seedSystemRules('inst-1');
    const sys = (await rules.findSystemByInstitute('inst-1'))[0];
    const del = new DeleteManualRuleUseCase(
      fakePolicy({ manager: true }),
      rules,
      new InMemoryTxnRepo(),
    );
    const upd = new UpdateRuleUseCase(fakePolicy({ manager: true }), rules);

    await expect(del.execute(managerActor, sys.id)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    await expect(
      upd.execute(managerActor, sys.id, { name: 'nope' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    // But re-valuing + activating a system rule is allowed.
    const view = await upd.execute(managerActor, sys.id, {
      amount: -8,
      isActive: true,
    });
    expect(view.amount).toBe(-8);
    expect(view.isActive).toBe(true);
  });

  it('snapshots history: editing a rule amount does not change past awards', async () => {
    const rules = new InMemoryRuleRepo();
    const rule = rules.add(manualRule('inst-1', 'part', 5));
    const past = DinarTransaction.awardRule({
      instituteId: 'inst-1',
      studentId: 's1',
      rule,
      context: DinarContext.Lesson,
      awardedBy: 'tch-1',
    });
    const upd = new UpdateRuleUseCase(fakePolicy({ manager: true }), rules);
    await upd.execute(managerActor, rule.id, { amount: 3 });
    expect(past.amount).toBe(5); // snapshot unaffected
  });
});
