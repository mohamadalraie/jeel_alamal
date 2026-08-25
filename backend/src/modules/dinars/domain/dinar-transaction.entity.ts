import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import { DinarContext } from './dinar-context';
import { DinarSourceType, isAutomaticSource } from './dinar-source';
import { DinarRule } from './dinar-rule.entity';

const REASON_MAX = 200;

interface DinarTransactionProps {
  instituteId: string;
  studentId: string;
  amount: number;
  context: DinarContext;
  sourceType: DinarSourceType;
  ruleId: string | null;
  ruleName: string | null;
  reason: string | null;
  sourceRef: string | null;
  awardedBy: string | null;
  reversesId: string | null;
  reversedAt: Date | null;
  createdAt: Date;
}

/** Natural key for an attendance projection: one per class+date+student. */
export const attendanceSourceRef = (classId: string, date: string): string =>
  `${classId}:${date}`;

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new BusinessRuleError('Dinar amount must be a whole number');
  }
  if (amount === 0)
    throw new BusinessRuleError('Dinar amount must be non-zero');
}

/**
 * A single dinar ledger entry (حركة). Immutable for manual/exceptional awards
 * (corrections are compensating reversals); automatic entries are projections
 * of a source record, replaced in place by the reconciliation use-cases.
 * Amount and rule name are snapshotted so later rule edits never alter history.
 */
export class DinarTransaction extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: DinarTransactionProps,
  ) {
    super(id);
  }

  private static base(
    over: Partial<DinarTransactionProps> & {
      instituteId: string;
      studentId: string;
      amount: number;
      context: DinarContext;
      sourceType: DinarSourceType;
    },
  ): DinarTransaction {
    return new DinarTransaction(randomUUID(), {
      ruleId: null,
      ruleName: null,
      reason: null,
      sourceRef: null,
      awardedBy: null,
      reversesId: null,
      reversedAt: null,
      createdAt: new Date(),
      ...over,
    });
  }

  /** Manual award of a rule. */
  static awardRule(input: {
    instituteId: string;
    studentId: string;
    rule: DinarRule;
    context: DinarContext;
    awardedBy: string;
  }): DinarTransaction {
    return DinarTransaction.base({
      instituteId: input.instituteId,
      studentId: input.studentId,
      amount: input.rule.amount,
      context: input.context,
      sourceType: DinarSourceType.ManualRule,
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      awardedBy: input.awardedBy,
    });
  }

  /** Manual exceptional award — custom amount + mandatory reason. */
  static awardExceptional(input: {
    instituteId: string;
    studentId: string;
    amount: number;
    reason: string;
    context: DinarContext;
    awardedBy: string;
  }): DinarTransaction {
    assertAmount(input.amount);
    const reason = input.reason?.trim() ?? '';
    if (!reason) throw new BusinessRuleError('A reason is required');
    if (reason.length > REASON_MAX) {
      throw new BusinessRuleError(`Reason must be ≤ ${REASON_MAX} characters`);
    }
    return DinarTransaction.base({
      instituteId: input.instituteId,
      studentId: input.studentId,
      amount: input.amount,
      context: input.context,
      sourceType: DinarSourceType.Exceptional,
      reason,
      awardedBy: input.awardedBy,
    });
  }

  /** Automatic projection from an attendance record. */
  static projectAttendance(input: {
    instituteId: string;
    studentId: string;
    rule: DinarRule;
    classId: string;
    date: string;
    awardedBy: string;
  }): DinarTransaction {
    return DinarTransaction.base({
      instituteId: input.instituteId,
      studentId: input.studentId,
      amount: input.rule.amount,
      context: DinarContext.Attendance,
      sourceType: DinarSourceType.Attendance,
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      sourceRef: attendanceSourceRef(input.classId, input.date),
      awardedBy: input.awardedBy,
    });
  }

  /** Automatic projection from a recitation record. */
  static projectRecitation(input: {
    instituteId: string;
    studentId: string;
    rule: DinarRule;
    recitationId: string;
    awardedBy: string;
  }): DinarTransaction {
    return DinarTransaction.base({
      instituteId: input.instituteId,
      studentId: input.studentId,
      amount: input.rule.amount,
      context: DinarContext.Recitation,
      sourceType: DinarSourceType.Recitation,
      ruleId: input.rule.id,
      ruleName: input.rule.name,
      sourceRef: input.recitationId,
      awardedBy: input.awardedBy,
    });
  }

  /**
   * Build the compensating entry that reverses a manual award. Guards that the
   * original is manual and not already reversed. Caller must also `markReversed`
   * the original and persist both.
   */
  static reversalOf(
    original: DinarTransaction,
    reversedBy: string,
  ): DinarTransaction {
    if (isAutomaticSource(original.sourceType)) {
      throw new BusinessRuleError('Automatic transactions cannot be reversed');
    }
    if (original.reversedAt) {
      throw new BusinessRuleError('Transaction is already reversed');
    }
    if (original.reversesId) {
      throw new BusinessRuleError('A reversal entry cannot itself be reversed');
    }
    return DinarTransaction.base({
      instituteId: original.instituteId,
      studentId: original.studentId,
      amount: -original.amount,
      context: original.context,
      sourceType: original.sourceType,
      ruleId: original.ruleId,
      ruleName: original.ruleName,
      reason: original.reason,
      reversesId: original.id,
      awardedBy: reversedBy,
    });
  }

  static reconstitute(
    id: string,
    props: DinarTransactionProps,
  ): DinarTransaction {
    return new DinarTransaction(id, props);
  }

  markReversed(at: Date): void {
    this.props.reversedAt = at;
  }

  get instituteId(): string {
    return this.props.instituteId;
  }
  get studentId(): string {
    return this.props.studentId;
  }
  get amount(): number {
    return this.props.amount;
  }
  get context(): DinarContext {
    return this.props.context;
  }
  get sourceType(): DinarSourceType {
    return this.props.sourceType;
  }
  get ruleId(): string | null {
    return this.props.ruleId;
  }
  get ruleName(): string | null {
    return this.props.ruleName;
  }
  get reason(): string | null {
    return this.props.reason;
  }
  get sourceRef(): string | null {
    return this.props.sourceRef;
  }
  get awardedBy(): string | null {
    return this.props.awardedBy;
  }
  get reversesId(): string | null {
    return this.props.reversesId;
  }
  get reversedAt(): Date | null {
    return this.props.reversedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Label shown in the ledger: the rule name, or the exceptional reason. */
  get label(): string {
    return this.props.ruleName ?? this.props.reason ?? '';
  }
}
