import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { AttendanceSession } from '../../domain/attendance-session.entity';
import { AttendanceRecord } from '../../domain/attendance-record.entity';
import { AttendanceStatus } from '../../domain/attendance-status';
import type {
  AttendanceRecordView,
  AttendanceRepository,
} from '../../domain/attendance.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import {
  attendanceRecords,
  attendanceSessions,
  type AttendanceSessionRow,
} from './attendance.schema';

const toSession = (r: AttendanceSessionRow): AttendanceSession =>
  AttendanceSession.reconstitute(r.id, {
    instituteId: r.instituteId,
    classId: r.classId,
    date: r.date,
    takenBy: r.takenBy,
    createdAt: r.createdAt,
  });

@Injectable()
export class DrizzleAttendanceRepository implements AttendanceRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async upsertSession(
    session: AttendanceSession,
    records: AttendanceRecord[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Replace any existing session for this class+date (records cascade away).
      await tx
        .delete(attendanceSessions)
        .where(
          and(
            eq(attendanceSessions.classId, session.classId),
            eq(attendanceSessions.date, session.date),
          ),
        );
      await tx.insert(attendanceSessions).values({
        id: session.id,
        instituteId: session.instituteId,
        classId: session.classId,
        date: session.date,
        takenBy: session.takenBy,
        createdAt: session.createdAt,
      });
      if (records.length > 0) {
        await tx.insert(attendanceRecords).values(
          records.map((r) => ({
            id: r.id,
            sessionId: r.sessionId,
            studentId: r.studentId,
            status: r.status,
          })),
        );
      }
    });
  }

  async findByClassAndDate(
    classId: string,
    date: string,
  ): Promise<{ session: AttendanceSession; records: AttendanceRecord[] } | null> {
    const [sessionRow] = await this.db
      .select()
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.classId, classId),
          eq(attendanceSessions.date, date),
        ),
      );
    if (!sessionRow) return null;
    const recordRows = await this.db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, sessionRow.id));
    return {
      session: toSession(sessionRow),
      records: recordRows.map((r) =>
        AttendanceRecord.reconstitute(r.id, {
          sessionId: r.sessionId,
          studentId: r.studentId,
          status: r.status as AttendanceStatus,
        }),
      ),
    };
  }

  async findSessionsByClass(classId: string): Promise<AttendanceSession[]> {
    const rows = await this.db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.classId, classId))
      .orderBy(desc(attendanceSessions.date));
    return rows.map(toSession);
  }

  async findRecordsByClass(classId: string): Promise<AttendanceRecordView[]> {
    const rows = await this.db
      .select({
        sessionId: attendanceRecords.sessionId,
        date: attendanceSessions.date,
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(
        attendanceSessions,
        eq(attendanceRecords.sessionId, attendanceSessions.id),
      )
      .where(eq(attendanceSessions.classId, classId));
    return rows.map((r) => ({
      sessionId: r.sessionId,
      date: r.date,
      studentId: r.studentId,
      status: r.status as AttendanceStatus,
    }));
  }

  async findRecordsByStudent(studentId: string): Promise<AttendanceRecordView[]> {
    const rows = await this.db
      .select({
        sessionId: attendanceRecords.sessionId,
        date: attendanceSessions.date,
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(
        attendanceSessions,
        eq(attendanceRecords.sessionId, attendanceSessions.id),
      )
      .where(eq(attendanceRecords.studentId, studentId));
    return rows.map((r) => ({
      sessionId: r.sessionId,
      date: r.date,
      studentId: r.studentId,
      status: r.status as AttendanceStatus,
    }));
  }
}
