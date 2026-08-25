import {
  AwardDinarUseCase,
  BulkAwardDinarUseCase,
  ReverseDinarUseCase,
} from './award-dinar.use-cases';
import { DinarAwardPolicy } from './dinar-award.policy';
import { DinarContext } from '../domain/dinar-context';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { attendanceSourceRef } from '../domain/dinar-transaction.entity';
import {
  BusinessRuleError,
  ForbiddenError,
} from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import type { UserRepository } from '../../users/domain/user.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import {
  InMemoryRuleRepo,
  InMemoryTxnRepo,
  fakePolicy,
  fakeUser,
  teacherActor,
  manualRule,
} from './dinars-test-fakes';

function userRepo(users: ReturnType<typeof fakeUser>[]): UserRepository {
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    findById: async (id: string) => byId.get(id) ?? null,
    findManyByIds: async (ids: string[]) =>
      ids
        .map((id) => byId.get(id))
        .filter((u): u is (typeof users)[number] => !!u),
  } as unknown as UserRepository;
}

function classRepo(config: {
  classOf: Record<string, { id: string; instituteId: string } | null>;
  teaches: Set<string>;
}): ClassRepository {
  return {
    findCurrentClassOfStudent: async (sid: string) =>
      config.classOf[sid] ?? null,
    isTeacherOfClass: async (cid: string, tid: string) =>
      config.teaches.has(`${cid}:${tid}`),
  } as unknown as ClassRepository;
}

const inClassPolicy = () =>
  new DinarAwardPolicy(
    fakePolicy({ manager: true }),
    classRepo({
      classOf: { s1: { id: 'c1', instituteId: 'inst-1' } },
      teaches: new Set(['c1:tch-1']),
    }),
  );

const student = (id: string) => fakeUser(id, UserRole.Student, 'inst-1', id);

describe('Award dinars (spec 010, US2)', () => {
  it('awards a rule, snapshotting amount and name', async () => {
    const rules = new InMemoryRuleRepo();
    const txns = new InMemoryTxnRepo();
    const rule = rules.add(manualRule('inst-1', 'مشاركة', 5));
    const uc = new AwardDinarUseCase(
      inClassPolicy(),
      userRepo([
        student('s1'),
        fakeUser('tch-1', UserRole.Teacher, 'inst-1', 'T'),
      ]),
      rules,
      txns,
    );

    const item = await uc.execute(teacherActor, 's1', {
      ruleId: rule.id,
      context: DinarContext.Lesson,
    });
    expect(item.amount).toBe(5);
    expect(item.label).toBe('مشاركة');
    expect(txns.balanceOf('s1')).toBe(5);
  });

  it('requires a rule or an amount+reason for exceptional awards', async () => {
    const rules = new InMemoryRuleRepo();
    const txns = new InMemoryTxnRepo();
    const uc = new AwardDinarUseCase(
      inClassPolicy(),
      userRepo([
        student('s1'),
        fakeUser('tch-1', UserRole.Teacher, 'inst-1', 'T'),
      ]),
      rules,
      txns,
    );
    // amount without reason → rejected
    await expect(
      uc.execute(teacherActor, 's1', { amount: -6 }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    // amount + reason → ok
    const item = await uc.execute(teacherActor, 's1', {
      amount: -6,
      reason: 'إتلاف أداة',
    });
    expect(item.amount).toBe(-6);
    expect(item.label).toBe('إتلاف أداة');
  });

  it('blocks a teacher awarding a student outside their classes', async () => {
    const rules = new InMemoryRuleRepo();
    const rule = rules.add(manualRule('inst-1', 'x', 5));
    const policy = new DinarAwardPolicy(
      fakePolicy({ manager: true }),
      classRepo({ classOf: { s9: null }, teaches: new Set() }),
    );
    const uc = new AwardDinarUseCase(
      policy,
      userRepo([student('s9'), fakeUser('tch-1', UserRole.Teacher, 'inst-1')]),
      rules,
      new InMemoryTxnRepo(),
    );
    await expect(
      uc.execute(teacherActor, 's9', { ruleId: rule.id }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('bulk-awards one rule to many students, one entry each', async () => {
    const rules = new InMemoryRuleRepo();
    const txns = new InMemoryTxnRepo();
    const rule = rules.add(manualRule('inst-1', 'مشاركة', 3));
    const policy = new DinarAwardPolicy(
      fakePolicy({ manager: true }),
      classRepo({
        classOf: {
          s1: { id: 'c1', instituteId: 'inst-1' },
          s2: { id: 'c1', instituteId: 'inst-1' },
          s3: { id: 'c1', instituteId: 'inst-1' },
        },
        teaches: new Set(['c1:tch-1']),
      }),
    );
    const uc = new BulkAwardDinarUseCase(
      policy,
      userRepo([student('s1'), student('s2'), student('s3')]),
      rules,
      txns,
    );
    const res = await uc.execute(teacherActor, {
      studentIds: ['s1', 's2', 's3'],
      ruleId: rule.id,
    });
    expect(res.awarded).toBe(3);
    expect(txns.txns).toHaveLength(3);
  });

  it('reverses a manual award once; automatic and repeat reversals are blocked', async () => {
    const txns = new InMemoryTxnRepo();
    const rule = manualRule('inst-1', 'مشاركة', 5);
    const original = DinarTransaction.awardRule({
      instituteId: 'inst-1',
      studentId: 's1',
      rule,
      context: DinarContext.Lesson,
      awardedBy: 'tch-1',
    });
    await txns.save(original);
    const uc = new ReverseDinarUseCase(
      fakePolicy({ manager: true }),
      userRepo([fakeUser('tch-1', UserRole.Teacher, 'inst-1', 'T')]),
      txns,
    );

    const rev = await uc.execute(teacherActor, original.id);
    expect(rev.amount).toBe(-5);
    expect(txns.balanceOf('s1')).toBe(0);
    // second reverse blocked
    await expect(uc.execute(teacherActor, original.id)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );

    // automatic projection cannot be reversed
    const auto = DinarTransaction.projectAttendance({
      instituteId: 'inst-1',
      studentId: 's1',
      rule,
      classId: 'c1',
      date: '2026-07-08',
      awardedBy: 'tch-1',
    });
    await txns.save(auto);
    expect(auto.sourceRef).toBe(attendanceSourceRef('c1', '2026-07-08'));
    await expect(uc.execute(teacherActor, auto.id)).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });
});
