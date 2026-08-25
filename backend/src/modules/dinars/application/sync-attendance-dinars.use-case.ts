import { Inject, Injectable } from '@nestjs/common';
import { DinarRule } from '../domain/dinar-rule.entity';
import {
  DinarTransaction,
  attendanceSourceRef,
} from '../domain/dinar-transaction.entity';
import { DinarSourceType } from '../domain/dinar-source';
import {
  DINAR_RULE_REPOSITORY,
  type DinarRuleRepository,
} from '../domain/dinar-rule.repository';
import {
  DINAR_TRANSACTION_REPOSITORY,
  type DinarTransactionRepository,
} from '../domain/dinar-transaction.repository';

export interface AttendanceDinarEntry {
  studentId: string;
  status: string; // AttendanceStatus value
}

export interface SyncAttendanceDinarsInput {
  instituteId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  entries: AttendanceDinarEntry[];
  takenBy: string;
}

/**
 * Reconcile the attendance dinar projections for one class+date (spec 010,
 * US3). Automatic dinars are projections: on any change they are replaced in
 * place, keyed by the natural key `classId:date` + student. Idempotent — re-running
 * with the same inputs makes no change. Called by TakeAttendanceUseCase after it
 * persists the session (whose record IDs are not stable across re-takes).
 */
@Injectable()
export class SyncAttendanceDinarsUseCase {
  constructor(
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(input: SyncAttendanceDinarsInput): Promise<void> {
    const sourceRef = attendanceSourceRef(input.classId, input.date);
    const [systemRules, existing] = await Promise.all([
      this.rules.findSystemByInstitute(input.instituteId),
      this.txns.findBySourceRef(DinarSourceType.Attendance, sourceRef),
    ]);

    const activeByKey = new Map<string, DinarRule>();
    for (const r of systemRules) {
      if (r.isActive && r.systemKey) activeByKey.set(r.systemKey, r);
    }
    const existingByStudent = new Map(existing.map((t) => [t.studentId, t]));
    const keptStudents = new Set<string>();

    const toInsert: DinarTransaction[] = [];
    for (const entry of input.entries) {
      keptStudents.add(entry.studentId);
      const target = activeByKey.get(`attendance.${entry.status}`);
      const current = existingByStudent.get(entry.studentId);

      if (!target) {
        if (current) await this.txns.deleteById(current.id);
        continue;
      }
      const unchanged =
        current &&
        current.ruleId === target.id &&
        current.amount === target.amount;
      if (unchanged) continue;
      if (current) await this.txns.deleteById(current.id);
      toInsert.push(
        DinarTransaction.projectAttendance({
          instituteId: input.instituteId,
          studentId: entry.studentId,
          rule: target,
          classId: input.classId,
          date: input.date,
          awardedBy: input.takenBy,
        }),
      );
    }

    // Students removed from the session lose their projection.
    for (const t of existing) {
      if (!keptStudents.has(t.studentId)) await this.txns.deleteById(t.id);
    }

    await this.txns.saveMany(toInsert);
  }
}
