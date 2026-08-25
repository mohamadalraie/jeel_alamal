import { GetDinarLeaderboardUseCase } from './leaderboard.use-case';
import { DinarContext } from '../domain/dinar-context';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { ForbiddenError } from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import type { UserRepository } from '../../users/domain/user.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import {
  InMemoryTxnRepo,
  fakePolicy,
  fakeUser,
  managerActor,
  teacherActor,
  manualRule,
} from './dinars-test-fakes';

const STUDENTS = ['s1', 's2', 's3'];

const users = (): UserRepository =>
  ({
    findManyByIds: async (ids: string[]) =>
      ids.map((id) =>
        fakeUser(id, UserRole.Student, 'inst-1', id.toUpperCase()),
      ),
    findByInstitute: async () =>
      STUDENTS.map((id) =>
        fakeUser(id, UserRole.Student, 'inst-1', id.toUpperCase()),
      ),
  }) as unknown as UserRepository;

const classes = (teaches: boolean): ClassRepository =>
  ({
    findById: async (id: string) => ({ id, instituteId: 'inst-1' }) as never,
    isTeacherOfClass: async () => teaches,
    getMembership: async () => ({
      teacherIds: [],
      supervisorId: null,
      studentIds: STUDENTS,
    }),
  }) as unknown as ClassRepository;

function seed(txns: InMemoryTxnRepo) {
  const award = (studentId: string, amount: number) =>
    txns.save(
      DinarTransaction.awardRule({
        instituteId: 'inst-1',
        studentId,
        rule: manualRule('inst-1', 'r', amount),
        context: DinarContext.Lesson,
        awardedBy: 'tch-1',
      }),
    );
  award('s1', 10);
  award('s2', 10);
  award('s3', 5);
}

describe('GetDinarLeaderboardUseCase (spec 010, US5)', () => {
  it('ranks by descending balance with ties sharing a rank', async () => {
    const txns = new InMemoryTxnRepo();
    seed(txns);
    const uc = new GetDinarLeaderboardUseCase(
      fakePolicy({ manager: true }),
      users(),
      classes(true),
      txns,
    );
    const res = await uc.execute(teacherActor, 'inst-1', 'c1');
    expect(res.scope).toBe('class');
    expect(res.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it('lets a manager view the institute-wide board', async () => {
    const txns = new InMemoryTxnRepo();
    seed(txns);
    const uc = new GetDinarLeaderboardUseCase(
      fakePolicy({ manager: true }),
      users(),
      classes(false),
      txns,
    );
    const res = await uc.execute(managerActor, 'inst-1');
    expect(res.scope).toBe('institute');
    expect(res.rows).toHaveLength(3);
  });

  it('blocks a teacher from a class they do not teach', async () => {
    const uc = new GetDinarLeaderboardUseCase(
      fakePolicy({ manager: true }),
      users(),
      classes(false),
      new InMemoryTxnRepo(),
    );
    await expect(
      uc.execute(teacherActor, 'inst-1', 'c1'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('blocks a teacher from the institute-wide board', async () => {
    const uc = new GetDinarLeaderboardUseCase(
      fakePolicy({ manager: false }),
      users(),
      classes(true),
      new InMemoryTxnRepo(),
    );
    await expect(uc.execute(teacherActor, 'inst-1')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
