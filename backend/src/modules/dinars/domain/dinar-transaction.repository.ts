import { DinarTransaction } from './dinar-transaction.entity';
import { DinarSourceType } from './dinar-source';

export const DINAR_TRANSACTION_REPOSITORY = Symbol(
  'DINAR_TRANSACTION_REPOSITORY',
);

/** Aggregate totals for a student's balance card. */
export interface DinarSummary {
  net: number;
  positive: number;
  negative: number;
  count: number;
}

/** One student's total, for the leaderboard. */
export interface StudentBalance {
  studentId: string;
  balance: number;
}

export interface DinarTransactionRepository {
  save(txn: DinarTransaction): Promise<void>;
  saveMany(txns: DinarTransaction[]): Promise<void>;
  findById(id: string): Promise<DinarTransaction | null>;
  /** All transactions sharing a source (attendance: `classId:date`; recitation id). */
  findBySourceRef(
    sourceType: DinarSourceType,
    sourceRef: string,
  ): Promise<DinarTransaction[]>;
  deleteById(id: string): Promise<void>;
  /** Stamp an original manual entry as reversed. */
  markReversed(id: string, reversedAt: Date): Promise<void>;
  /** Whether any transaction references a rule (blocks manual-rule deletion). */
  existsForRule(ruleId: string): Promise<boolean>;
  /** A student's full ledger, newest first. */
  findByStudent(studentId: string): Promise<DinarTransaction[]>;
  /** Net / positive / negative / count for a student. */
  summaryByStudent(studentId: string): Promise<DinarSummary>;
  /** `SUM(amount)` grouped for the given students (leaderboard). */
  balancesForStudents(studentIds: string[]): Promise<StudentBalance[]>;
}
