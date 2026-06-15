import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { AttendanceSession } from '../domain/attendance-session.entity';
import { AttendanceRecord } from '../domain/attendance-record.entity';
import { ATTENDANCE_REPOSITORY } from '../domain/attendance.repository';
import type { AttendanceRepository } from '../domain/attendance.repository';
import {
  buildSessions,
  buildStudentStats,
  buildTotals,
  rateOf,
} from './attendance-stats';
import {
  ClassAttendanceResult,
  SessionDetailResult,
  StudentAttendanceResult,
  TakeAttendanceDto,
} from './dto/attendance.dto';

/** Record (or re-record) attendance for a class on a given date. Staff only. */
@Injectable()
export class TakeAttendanceUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendance: AttendanceRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    dto: TakeAttendanceDto,
  ): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertStaffOf(actor, klass.instituteId);

    const membership = await this.classes.getMembership(classId);
    const enrolled = new Set(membership.studentIds);

    // Every entry must be for a currently-enrolled student; reject duplicates.
    const seen = new Set<string>();
    for (const e of dto.entries) {
      if (!enrolled.has(e.studentId)) {
        throw new BusinessRuleError('A student is not enrolled in this class');
      }
      if (seen.has(e.studentId)) {
        throw new BusinessRuleError('Duplicate student in attendance entries');
      }
      seen.add(e.studentId);
    }

    const session = AttendanceSession.create({
      instituteId: klass.instituteId,
      classId,
      date: dto.date,
      takenBy: actor.userId,
    });
    const records = dto.entries.map((e) =>
      AttendanceRecord.create({
        sessionId: session.id,
        studentId: e.studentId,
        status: e.status,
      }),
    );
    await this.attendance.upsertSession(session, records);
  }
}

/** Class attendance overview: totals, per-session, per-student + roster. Staff only. */
@Injectable()
export class GetClassAttendanceUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendance: AttendanceRepository,
  ) {}

  async execute(actor: Actor, classId: string): Promise<ClassAttendanceResult> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertStaffOf(actor, klass.instituteId);

    const [membership, records] = await Promise.all([
      this.classes.getMembership(classId),
      this.attendance.findRecordsByClass(classId),
    ]);
    const people = await this.users.findManyByIds(membership.studentIds);
    const nameMap = new Map(people.map((u) => [u.id, u.fullName]));
    const nameOf = (id: string) => nameMap.get(id) ?? '—';
    const roster = membership.studentIds.map((id) => ({ id, name: nameOf(id) }));

    const totals = buildTotals(records);
    const sessions = buildSessions(records);
    return {
      totals,
      rate: rateOf(totals),
      sessionCount: sessions.length,
      sessions,
      students: buildStudentStats(records, roster, nameOf),
      roster: roster.sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    };
  }
}

/** Load an existing session so the take-attendance screen can pre-fill. Staff only. */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendance: AttendanceRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    date: string,
  ): Promise<SessionDetailResult | null> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertStaffOf(actor, klass.instituteId);

    const found = await this.attendance.findByClassAndDate(classId, date);
    if (!found) return null;
    return {
      date: found.session.date,
      entries: found.records.map((r) => ({
        studentId: r.studentId,
        status: r.status,
      })),
    };
  }
}

/** A student's own attendance detail + stats. Staff of the institute, or the student. */
@Injectable()
export class GetStudentAttendanceUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendance: AttendanceRepository,
  ) {}

  async execute(
    actor: Actor,
    studentId: string,
  ): Promise<StudentAttendanceResult> {
    const student = await this.users.findById(studentId);
    if (!student || student.role !== UserRole.Student || !student.instituteId) {
      throw new NotFoundError('Student not found');
    }
    // A student may read only their own attendance; everyone else must be staff.
    const isSelf = actor.role === UserRole.Student && actor.userId === studentId;
    if (!isSelf) {
      await this.policy.assertStaffOf(actor, student.instituteId);
    }

    const records = await this.attendance.findRecordsByStudent(studentId);
    const counts = buildTotals(records);
    return {
      counts,
      total: records.length,
      rate: rateOf(counts),
      log: records
        .map((r) => ({ date: r.date, status: r.status }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    };
  }
}
