import { GetStudentDinarsUseCase } from './student-dinars.use-cases';
import { DinarContext } from '../domain/dinar-context';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { ForbiddenError } from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import type { UserRepository } from '../../users/domain/user.repository';
import {
  InMemoryTxnRepo,
  fakePolicy,
  fakeUser,
  managerActor,
  studentActor,
  manualRule,
} from './dinars-test-fakes';

const users = (): UserRepository =>
  ({
    findById: async (id: string) =>
      id === 's1' ? fakeUser('s1', UserRole.Student, 'inst-1', 'S1') : null,
    findManyByIds: async () => [
      fakeUser('tch-1', UserRole.Teacher, 'inst-1', 'T'),
    ],
  }) as unknown as UserRepository;

function seedLedger(txns: InMemoryTxnRepo) {
  const rule = (amount: number) => manualRule('inst-1', 'r', amount);
  for (const amount of [5, 10, -8]) {
    txns.save(
      DinarTransaction.awardRule({
        instituteId: 'inst-1',
        studentId: 's1',
        rule: rule(amount),
        context: DinarContext.Lesson,
        awardedBy: 'tch-1',
      }),
    );
  }
}

describe('GetStudentDinarsUseCase (spec 010, US4)', () => {
  it('returns net/positive/negative totals and the full ledger for the student', async () => {
    const txns = new InMemoryTxnRepo();
    seedLedger(txns);
    const uc = new GetStudentDinarsUseCase(
      fakePolicy({ staff: true }),
      users(),
      txns,
    );

    const res = await uc.execute(studentActor('s1'), 's1');
    expect(res.summary).toEqual({
      net: 7,
      positive: 15,
      negative: -8,
      count: 3,
    });
    expect(res.ledger).toHaveLength(3);
  });

  it('allows institute staff to view a student', async () => {
    const txns = new InMemoryTxnRepo();
    const uc = new GetStudentDinarsUseCase(
      fakePolicy({ staff: true }),
      users(),
      txns,
    );
    await expect(uc.execute(managerActor, 's1')).resolves.toBeDefined();
  });

  it('denies a different student', async () => {
    const txns = new InMemoryTxnRepo();
    const uc = new GetStudentDinarsUseCase(
      fakePolicy({ staff: false }),
      users(),
      txns,
    );
    await expect(uc.execute(studentActor('s2'), 's1')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
