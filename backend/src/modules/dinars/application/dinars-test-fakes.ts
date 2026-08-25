import { ForbiddenError } from '../../../shared/domain/domain.error';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { DinarRule } from '../domain/dinar-rule.entity';
import { DinarContext } from '../domain/dinar-context';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { DinarSourceType } from '../domain/dinar-source';
import type { DinarRuleRepository } from '../domain/dinar-rule.repository';
import type {
  DinarSummary,
  DinarTransactionRepository,
  StudentBalance,
} from '../domain/dinar-transaction.repository';
import { SYSTEM_RULE_DEFAULTS } from '../domain/system-rule-keys';
import type { User } from '../../users/domain/user.entity';

/** Lightweight User stand-in — use-cases only read id/role/instituteId/fullName. */
export const fakeUser = (
  id: string,
  role: UserRole,
  instituteId: string | null,
  fullName = id,
): User => ({ id, role, instituteId, fullName }) as unknown as User;

export class InMemoryRuleRepo implements DinarRuleRepository {
  rules = new Map<string, DinarRule>();

  add(rule: DinarRule): DinarRule {
    this.rules.set(rule.id, rule);
    return rule;
  }
  async findManualByInstitute(instituteId: string): Promise<DinarRule[]> {
    return [...this.rules.values()].filter(
      (r) => r.instituteId === instituteId && r.systemKey === null,
    );
  }
  async findSystemByInstitute(instituteId: string): Promise<DinarRule[]> {
    return [...this.rules.values()].filter(
      (r) => r.instituteId === instituteId && r.systemKey !== null,
    );
  }
  async findById(id: string): Promise<DinarRule | null> {
    return this.rules.get(id) ?? null;
  }
  async save(rule: DinarRule): Promise<void> {
    this.rules.set(rule.id, rule);
  }
  async delete(id: string): Promise<void> {
    this.rules.delete(id);
  }
  async seedSystemRules(instituteId: string): Promise<void> {
    const have = new Set(
      (await this.findSystemByInstitute(instituteId)).map((r) => r.systemKey),
    );
    for (const d of SYSTEM_RULE_DEFAULTS) {
      if (have.has(d.systemKey)) continue;
      this.add(
        DinarRule.createSystem({
          instituteId,
          systemKey: d.systemKey,
          context: d.context,
          name: d.systemKey,
        }),
      );
    }
  }
}

export class InMemoryTxnRepo implements DinarTransactionRepository {
  txns: DinarTransaction[] = [];

  async save(txn: DinarTransaction): Promise<void> {
    this.txns.push(txn);
  }
  async saveMany(txns: DinarTransaction[]): Promise<void> {
    this.txns.push(...txns);
  }
  async findById(id: string): Promise<DinarTransaction | null> {
    return this.txns.find((t) => t.id === id) ?? null;
  }
  async findBySourceRef(
    sourceType: DinarSourceType,
    sourceRef: string,
  ): Promise<DinarTransaction[]> {
    return this.txns.filter(
      (t) => t.sourceType === sourceType && t.sourceRef === sourceRef,
    );
  }
  async deleteById(id: string): Promise<void> {
    this.txns = this.txns.filter((t) => t.id !== id);
  }
  async markReversed(id: string, reversedAt: Date): Promise<void> {
    this.txns.find((t) => t.id === id)?.markReversed(reversedAt);
  }
  async existsForRule(ruleId: string): Promise<boolean> {
    return this.txns.some((t) => t.ruleId === ruleId);
  }
  async findByStudent(studentId: string): Promise<DinarTransaction[]> {
    return this.txns
      .filter((t) => t.studentId === studentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async summaryByStudent(studentId: string): Promise<DinarSummary> {
    const mine = this.txns.filter((t) => t.studentId === studentId);
    const positive = mine
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    const negative = mine
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + t.amount, 0);
    return { net: positive + negative, positive, negative, count: mine.length };
  }
  async balancesForStudents(studentIds: string[]): Promise<StudentBalance[]> {
    const set = new Set(studentIds);
    const map = new Map<string, number>();
    for (const t of this.txns) {
      if (!set.has(t.studentId)) continue;
      map.set(t.studentId, (map.get(t.studentId) ?? 0) + t.amount);
    }
    return [...map.entries()].map(([studentId, balance]) => ({
      studentId,
      balance,
    }));
  }

  balanceOf(studentId: string): number {
    return this.txns
      .filter((t) => t.studentId === studentId)
      .reduce((s, t) => s + t.amount, 0);
  }
}

/** Configurable access-policy stub (InstituteAccessPolicy shape). */
export function fakePolicy(opts: { manager?: boolean; staff?: boolean } = {}) {
  return {
    assertManagerOf: (_actor: Actor, _instituteId: string) => {
      void _actor;
      void _instituteId;
      if (opts.manager === false) throw new ForbiddenError('not manager');
      return Promise.resolve();
    },
    assertStaffOf: (_actor: Actor, _instituteId: string) => {
      void _actor;
      void _instituteId;
      if (opts.staff === false) throw new ForbiddenError('not staff');
      return Promise.resolve();
    },
  } as unknown as import('../../institutes/application/institute-access.policy').InstituteAccessPolicy;
}

export const managerActor: Actor = {
  userId: 'mgr-1',
  role: UserRole.InstituteManager,
  instituteId: null,
};
export const teacherActor: Actor = {
  userId: 'tch-1',
  role: UserRole.Teacher,
  instituteId: 'inst-1',
};
export const studentActor = (id: string): Actor => ({
  userId: id,
  role: UserRole.Student,
  instituteId: 'inst-1',
});

export const manualRule = (
  instituteId: string,
  name: string,
  amount: number,
  context = DinarContext.Lesson,
): DinarRule => DinarRule.create({ instituteId, name, amount, context });
