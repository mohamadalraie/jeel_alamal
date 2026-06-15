import {
  AttendanceStatus,
  ATTENDED_STATUSES,
} from '../domain/attendance-status';
import { AttendanceRecordView } from '../domain/attendance.repository';
import {
  AttendanceStatusCounts,
  SessionSummary,
  StudentAttendanceStats,
} from './dto/attendance.dto';

export function emptyCounts(): AttendanceStatusCounts {
  return { present: 0, absent: 0, justified: 0, late: 0 };
}

function add(counts: AttendanceStatusCounts, status: AttendanceStatus): void {
  counts[status] += 1;
}

function totalOf(counts: AttendanceStatusCounts): number {
  return counts.present + counts.absent + counts.justified + counts.late;
}

function attendedOf(counts: AttendanceStatusCounts): number {
  return ATTENDED_STATUSES.reduce((sum, s) => sum + counts[s], 0);
}

/** attended (present + late) / total, rounded to a whole percent. */
export function rateOf(counts: AttendanceStatusCounts): number {
  const total = totalOf(counts);
  return total === 0 ? 0 : Math.round((attendedOf(counts) / total) * 100);
}

/** Overall counts across every record. */
export function buildTotals(records: AttendanceRecordView[]): AttendanceStatusCounts {
  const counts = emptyCounts();
  for (const r of records) add(counts, r.status);
  return counts;
}

/** Per-session summaries, newest date first. */
export function buildSessions(records: AttendanceRecordView[]): SessionSummary[] {
  const byDate = new Map<string, AttendanceStatusCounts>();
  for (const r of records) {
    if (!byDate.has(r.date)) byDate.set(r.date, emptyCounts());
    add(byDate.get(r.date)!, r.status);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, counts]) => ({ date, counts, total: totalOf(counts) }));
}

/**
 * Per-student aggregates. `nameOf` resolves the display name; `roster` ensures
 * even students with no records yet appear (zero-filled).
 */
export function buildStudentStats(
  records: AttendanceRecordView[],
  roster: { id: string; name: string }[],
  nameOf: (id: string) => string,
): StudentAttendanceStats[] {
  const byStudent = new Map<string, AttendanceStatusCounts>();
  for (const s of roster) byStudent.set(s.id, emptyCounts());
  for (const r of records) {
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, emptyCounts());
    add(byStudent.get(r.studentId)!, r.status);
  }
  return [...byStudent.entries()]
    .map(([studentId, counts]) => ({
      studentId,
      studentName: nameOf(studentId),
      counts,
      total: totalOf(counts),
      rate: rateOf(counts),
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
}
