import { AttendanceSession } from './attendance-session.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceStatus } from './attendance-status';

export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');

/** A record joined with its session's date — the read model for statistics. */
export interface AttendanceRecordView {
  sessionId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceRepository {
  /**
   * Upsert a session for (classId, date): replaces any existing session for
   * that day and its records with the supplied set, in one transaction.
   */
  upsertSession(
    session: AttendanceSession,
    records: AttendanceRecord[],
  ): Promise<void>;

  /** The session for a class on a date, with its records, if any. */
  findByClassAndDate(
    classId: string,
    date: string,
  ): Promise<{ session: AttendanceSession; records: AttendanceRecord[] } | null>;

  /** All sessions for a class, newest date first. */
  findSessionsByClass(classId: string): Promise<AttendanceSession[]>;

  /** Every record of a class joined with its session date (for stats). */
  findRecordsByClass(classId: string): Promise<AttendanceRecordView[]>;

  /** Every record for one student joined with its session date (for stats). */
  findRecordsByStudent(studentId: string): Promise<AttendanceRecordView[]>;
}
