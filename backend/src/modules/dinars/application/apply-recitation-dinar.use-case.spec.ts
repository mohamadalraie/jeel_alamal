import { ApplyRecitationDinarUseCase } from './apply-recitation-dinar.use-case';
import { DinarSourceType } from '../domain/dinar-source';
import { InMemoryRuleRepo, InMemoryTxnRepo } from './dinars-test-fakes';

const INST = 'inst-1';

async function configure(
  rules: InMemoryRuleRepo,
  key: string,
  amount: number,
  active: boolean,
): Promise<void> {
  const rule = (await rules.findSystemByInstitute(INST)).find(
    (r) => r.systemKey === key,
  )!;
  rule.setAmount(amount);
  rule.setActive(active);
  await rules.save(rule);
}

describe('ApplyRecitationDinarUseCase (spec 010, US3)', () => {
  it('awards dinars from the recitation rating, keyed by recitation id', async () => {
    const rules = new InMemoryRuleRepo();
    const txns = new InMemoryTxnRepo();
    await rules.seedSystemRules(INST);
    await configure(rules, 'recitation.excellent', 10, true);
    const uc = new ApplyRecitationDinarUseCase(rules, txns);

    await uc.execute({
      instituteId: INST,
      studentId: 's1',
      recitationId: 'r1',
      rating: 'excellent',
      recitedBy: 'tch-1',
    });
    expect(txns.balanceOf('s1')).toBe(10);
    expect(
      await txns.findBySourceRef(DinarSourceType.Recitation, 'r1'),
    ).toHaveLength(1);
  });

  it('does not duplicate on re-apply, and skips when the rule is inactive', async () => {
    const rules = new InMemoryRuleRepo();
    const txns = new InMemoryTxnRepo();
    await rules.seedSystemRules(INST);
    await configure(rules, 'recitation.weak', -3, false);
    const uc = new ApplyRecitationDinarUseCase(rules, txns);

    await uc.execute({
      instituteId: INST,
      studentId: 's1',
      recitationId: 'r2',
      rating: 'weak',
      recitedBy: 'tch-1',
    });
    expect(txns.balanceOf('s1')).toBe(0); // inactive → no entry

    await configure(rules, 'recitation.weak', -3, true);
    await uc.execute({
      instituteId: INST,
      studentId: 's1',
      recitationId: 'r2',
      rating: 'weak',
      recitedBy: 'tch-1',
    });
    await uc.execute({
      instituteId: INST,
      studentId: 's1',
      recitationId: 'r2',
      rating: 'weak',
      recitedBy: 'tch-1',
    });
    expect(
      await txns.findBySourceRef(DinarSourceType.Recitation, 'r2'),
    ).toHaveLength(1);
    expect(txns.balanceOf('s1')).toBe(-3);
  });
});
