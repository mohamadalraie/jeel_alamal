import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import {
  DINAR_TRANSACTION_REPOSITORY,
  type DinarTransactionRepository,
} from '../domain/dinar-transaction.repository';
import { DinarLeaderboardRow, DinarLeaderboardView } from './dto/dinar.dto';

/** Rank rows by descending balance; ties share a rank (competition ranking). */
function rank(
  entries: { studentId: string; name: string; balance: number }[],
): DinarLeaderboardRow[] {
  const sorted = [...entries].sort(
    (a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'ar'),
  );
  let lastBalance: number | null = null;
  let lastRank = 0;
  return sorted.map((e, i) => {
    const r =
      lastBalance !== null && e.balance === lastBalance ? lastRank : i + 1;
    lastBalance = e.balance;
    lastRank = r;
    return {
      rank: r,
      studentId: e.studentId,
      name: e.name,
      balance: e.balance,
    };
  });
}

/** Leaderboard by net balance — institute-wide (managers) or per class (staff). */
@Injectable()
export class GetDinarLeaderboardUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    classId?: string,
  ): Promise<DinarLeaderboardView> {
    const studentIds = classId
      ? await this.resolveClassStudents(actor, instituteId, classId)
      : await this.resolveInstituteStudents(actor, instituteId);

    const [people, balances] = await Promise.all([
      this.users.findManyByIds(studentIds),
      this.txns.balancesForStudents(studentIds),
    ]);
    const nameMap = new Map(people.map((u) => [u.id, u.fullName]));
    const balanceMap = new Map(balances.map((b) => [b.studentId, b.balance]));

    const rows = rank(
      studentIds.map((id) => ({
        studentId: id,
        name: nameMap.get(id) ?? '—',
        balance: balanceMap.get(id) ?? 0,
      })),
    );
    return { scope: classId ? 'class' : 'institute', rows };
  }

  private async resolveClassStudents(
    actor: Actor,
    instituteId: string,
    classId: string,
  ): Promise<string[]> {
    const klass = await this.classes.findById(classId);
    if (!klass || klass.instituteId !== instituteId) {
      throw new NotFoundError('Class not found');
    }
    if (actor.role === UserRole.Teacher) {
      if (!(await this.classes.isTeacherOfClass(classId, actor.userId))) {
        throw new ForbiddenError('You do not teach this class');
      }
    } else {
      await this.policy.assertManagerOf(actor, instituteId);
    }
    const membership = await this.classes.getMembership(classId);
    return membership.studentIds;
  }

  private async resolveInstituteStudents(
    actor: Actor,
    instituteId: string,
  ): Promise<string[]> {
    // Institute-wide leaderboard is manager-only (teachers are class-scoped).
    await this.policy.assertManagerOf(actor, instituteId);
    const students = await this.users.findByInstitute(
      instituteId,
      UserRole.Student,
    );
    return students.map((s) => s.id);
  }
}
