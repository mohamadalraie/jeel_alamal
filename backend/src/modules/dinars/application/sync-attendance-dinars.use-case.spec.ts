import { SyncAttendanceDinarsUseCase } from './sync-attendance-dinars.use-case';
import { DinarSourceType } from '../domain/dinar-source';
import { attendanceSourceRef } from '../domain/dinar-transaction.entity';
import { InMemoryRuleRepo, InMemoryTxnRepo } from './dinars-test-fakes';

async function configure(
  rules: InMemoryRuleRepo,
  instituteId: string,
  key: string,
  amount: number,
  active: boolean,
): Promise<void> {
  const rule = (await rules.findSystemByInstitute(instituteId)).find(
    (r) => r.systemKey === key,
  )!;
  rule.setAmount(amount);
  rule.setActive(active);
  await rules.save(rule);
}

const INST = 'inst-1';
const CLASS = 'c1';
const DATE = '2026-07-08';
const ref = attendanceSourceRef(CLASS, DATE);

async function setup() {
  const rules = new InMemoryRuleRepo();
  const txns = new InMemoryTxnRepo();
  await rules.seedSystemRules(INST);
  await configure(rules, INST, 'attendance.absent', -8, true);
  await configure(rules, INST, 'attendance.present', 2, true);
  const uc = new SyncAttendanceDinarsUseCase(rules, txns);
  return { rules, txns, uc };
}

describe('SyncAttendanceDinarsUseCase (spec 010, US3)', () => {
  it('creates a projection for an absent student', async () => {
    const { txns, uc } = await setup();
    await uc.execute({
      instituteId: INST,
      classId: CLASS,
      date: DATE,
      entries: [{ studentId: 's1', status: 'absent' }],
      takenBy: 'tch-1',
    });
    expect(txns.balanceOf('s1')).toBe(-8);
    expect(
      await txns.findBySourceRef(DinarSourceType.Attendance, ref),
    ).toHaveLength(1);
  });

  it('replaces the projection when the status changes (no leftover)', async () => {
    const { txns, uc } = await setup();
    const base = {
      instituteId: INST,
      classId: CLASS,
      date: DATE,
      takenBy: 'tch-1',
    };
    await uc.execute({
      ...base,
      entries: [{ studentId: 's1', status: 'absent' }],
    });
    await uc.execute({
      ...base,
      entries: [{ studentId: 's1', status: 'present' }],
    });
    expect(txns.balanceOf('s1')).toBe(2);
    expect(
      await txns.findBySourceRef(DinarSourceType.Attendance, ref),
    ).toHaveLength(1);
  });

  it('is idempotent when re-saved unchanged', async () => {
    const { txns, uc } = await setup();
    const call = {
      instituteId: INST,
      classId: CLASS,
      date: DATE,
      takenBy: 'tch-1',
      entries: [{ studentId: 's1', status: 'present' }],
    };
    await uc.execute(call);
    await uc.execute(call);
    expect(
      await txns.findBySourceRef(DinarSourceType.Attendance, ref),
    ).toHaveLength(1);
    expect(txns.balanceOf('s1')).toBe(2);
  });

  it('creates no entry when the matching rule is inactive', async () => {
    const { rules, txns, uc } = await setup();
    await configure(rules, INST, 'attendance.absent', -8, false);
    await uc.execute({
      instituteId: INST,
      classId: CLASS,
      date: DATE,
      entries: [{ studentId: 's2', status: 'absent' }],
      takenBy: 'tch-1',
    });
    expect(txns.balanceOf('s2')).toBe(0);
  });

  it('removes the projection when a student drops out of the session', async () => {
    const { txns, uc } = await setup();
    const base = {
      instituteId: INST,
      classId: CLASS,
      date: DATE,
      takenBy: 'tch-1',
    };
    await uc.execute({
      ...base,
      entries: [{ studentId: 's1', status: 'absent' }],
    });
    await uc.execute({ ...base, entries: [] });
    expect(
      await txns.findBySourceRef(DinarSourceType.Attendance, ref),
    ).toHaveLength(0);
  });
});
