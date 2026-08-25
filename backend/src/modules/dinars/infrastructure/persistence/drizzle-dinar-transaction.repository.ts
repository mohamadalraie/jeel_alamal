import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DinarTransaction } from '../../domain/dinar-transaction.entity';
import { DinarContext } from '../../domain/dinar-context';
import { DinarSourceType } from '../../domain/dinar-source';
import type {
  DinarSummary,
  DinarTransactionRepository,
  StudentBalance,
} from '../../domain/dinar-transaction.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { dinarTransactions, type DinarTransactionRow } from './dinar.schema';

const toDomain = (r: DinarTransactionRow): DinarTransaction =>
  DinarTransaction.reconstitute(r.id, {
    instituteId: r.instituteId,
    studentId: r.studentId,
    amount: r.amount,
    context: r.context as DinarContext,
    sourceType: r.sourceType as DinarSourceType,
    ruleId: r.ruleId,
    ruleName: r.ruleName,
    reason: r.reason,
    sourceRef: r.sourceRef,
    awardedBy: r.awardedBy,
    reversesId: r.reversesId,
    reversedAt: r.reversedAt,
    createdAt: r.createdAt,
  });

const toRow = (t: DinarTransaction) => ({
  id: t.id,
  instituteId: t.instituteId,
  studentId: t.studentId,
  amount: t.amount,
  context: t.context,
  sourceType: t.sourceType,
  ruleId: t.ruleId,
  ruleName: t.ruleName,
  reason: t.reason,
  sourceRef: t.sourceRef,
  awardedBy: t.awardedBy,
  reversesId: t.reversesId,
  reversedAt: t.reversedAt,
  createdAt: t.createdAt,
});

@Injectable()
export class DrizzleDinarTransactionRepository implements DinarTransactionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(txn: DinarTransaction): Promise<void> {
    await this.db.insert(dinarTransactions).values(toRow(txn));
  }

  async saveMany(txns: DinarTransaction[]): Promise<void> {
    if (txns.length === 0) return;
    await this.db.insert(dinarTransactions).values(txns.map(toRow));
  }

  async findById(id: string): Promise<DinarTransaction | null> {
    const [row] = await this.db
      .select()
      .from(dinarTransactions)
      .where(eq(dinarTransactions.id, id));
    return row ? toDomain(row) : null;
  }

  async findBySourceRef(
    sourceType: DinarSourceType,
    sourceRef: string,
  ): Promise<DinarTransaction[]> {
    const rows = await this.db
      .select()
      .from(dinarTransactions)
      .where(
        and(
          eq(dinarTransactions.sourceType, sourceType),
          eq(dinarTransactions.sourceRef, sourceRef),
        ),
      );
    return rows.map(toDomain);
  }

  async deleteById(id: string): Promise<void> {
    await this.db.delete(dinarTransactions).where(eq(dinarTransactions.id, id));
  }

  async markReversed(id: string, reversedAt: Date): Promise<void> {
    await this.db
      .update(dinarTransactions)
      .set({ reversedAt })
      .where(eq(dinarTransactions.id, id));
  }

  async existsForRule(ruleId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: dinarTransactions.id })
      .from(dinarTransactions)
      .where(eq(dinarTransactions.ruleId, ruleId))
      .limit(1);
    return !!row;
  }

  async findByStudent(studentId: string): Promise<DinarTransaction[]> {
    const rows = await this.db
      .select()
      .from(dinarTransactions)
      .where(eq(dinarTransactions.studentId, studentId))
      .orderBy(desc(dinarTransactions.createdAt));
    return rows.map(toDomain);
  }

  async summaryByStudent(studentId: string): Promise<DinarSummary> {
    const [row] = await this.db
      .select({
        net: sql<string>`coalesce(sum(${dinarTransactions.amount}), 0)`,
        positive: sql<string>`coalesce(sum(case when ${dinarTransactions.amount} > 0 then ${dinarTransactions.amount} else 0 end), 0)`,
        negative: sql<string>`coalesce(sum(case when ${dinarTransactions.amount} < 0 then ${dinarTransactions.amount} else 0 end), 0)`,
        count: sql<string>`count(*)`,
      })
      .from(dinarTransactions)
      .where(eq(dinarTransactions.studentId, studentId));
    return {
      net: Number(row?.net ?? 0),
      positive: Number(row?.positive ?? 0),
      negative: Number(row?.negative ?? 0),
      count: Number(row?.count ?? 0),
    };
  }

  async balancesForStudents(studentIds: string[]): Promise<StudentBalance[]> {
    if (studentIds.length === 0) return [];
    const rows = await this.db
      .select({
        studentId: dinarTransactions.studentId,
        balance: sql<string>`coalesce(sum(${dinarTransactions.amount}), 0)`,
      })
      .from(dinarTransactions)
      .where(inArray(dinarTransactions.studentId, studentIds))
      .groupBy(dinarTransactions.studentId);
    return rows.map((r) => ({
      studentId: r.studentId,
      balance: Number(r.balance),
    }));
  }
}
