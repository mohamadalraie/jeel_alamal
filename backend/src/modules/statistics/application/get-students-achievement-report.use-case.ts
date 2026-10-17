import { Inject, Injectable } from '@nestjs/common';
import { eq, and, gte, lte, inArray, isNull } from 'drizzle-orm';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { DRIZZLE, type DrizzleDb } from '../../../core/database/drizzle.provider';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import {
  classes,
  classStudents,
} from '../../classes/infrastructure/persistence/class.schema';
import {
  attendanceSessions,
  attendanceRecords,
} from '../../attendance/infrastructure/persistence/attendance.schema';
import { recitations } from '../../recitations/infrastructure/persistence/recitation.schema';
import { dinarTransactions } from '../../dinars/infrastructure/persistence/dinar.schema';
import { getSurah } from '../../recitations/domain/quran';

export interface StudentAchievementItem {
  studentId: string;
  name: string;
  username: string;
  phone: string | null;
  schoolGrade: string | null;
  className: string;
  classIds: string[];
  track: 'regular' | 'intensive';
  attendance: {
    rate: number;
    present: number;
    late: number;
    justified: number;
    absent: number;
    totalSessions: number;
  };
  dinars: {
    gained: number;
    lost: number;
    net: number;
  };
  recitation: {
    totalAyahs: number;
    totalSessions: number;
    surahsSummary: string;
    surahs: {
      number: number;
      name: string;
      ayahsRecited: number;
      surahTotalAyahs: number;
      percent: number;
    }[];
  };
}

export interface StudentsAchievementReportResponse {
  instituteId: string;
  startDate: string;
  endDate: string;
  totalStudents: number;
  summary: {
    averageAttendanceRate: number;
    totalDinarsGained: number;
    totalDinarsLost: number;
    totalAyahsRecited: number;
    studentsWithRecitations: number;
  };
  students: StudentAchievementItem[];
}

@Injectable()
export class GetStudentsAchievementReportUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classesRepo: ClassRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    query: {
      startDate?: string;
      endDate?: string;
      classId?: string;
      track?: 'all' | 'regular' | 'intensive';
    },
  ): Promise<StudentsAchievementReportResponse> {
    // 1. Assert staff permission (super admin, assigned manager, or teacher)
    await this.policy.assertStaffOf(actor, instituteId);

    // 2. Default date range to last 30 days if not provided
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const startDate = query.startDate && /^\d{4}-\d{2}-\d{2}$/.test(query.startDate)
      ? query.startDate
      : thirtyDaysAgoStr;
    const endDate = query.endDate && /^\d{4}-\d{2}-\d{2}$/.test(query.endDate)
      ? query.endDate
      : todayStr;

    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    // 3. Fetch students of this institute
    const allInstituteStudents = await this.users.findByInstitute(
      instituteId,
      UserRole.Student,
    );

    const intensiveIds = new Set(
      await this.classesRepo.getIntensiveStudentIdsForInstitute(instituteId),
    );

    // Map class assignments for all students in this institute
    const studentClassAssignments = await this.db
      .select({
        studentId: classStudents.studentId,
        classId: classes.id,
        className: classes.name,
      })
      .from(classStudents)
      .innerJoin(classes, eq(classes.id, classStudents.classId))
      .where(eq(classes.instituteId, instituteId));

    const studentClassesMap = new Map<string, { id: string; name: string }[]>();
    for (const sc of studentClassAssignments) {
      const list = studentClassesMap.get(sc.studentId) || [];
      list.push({ id: sc.classId, name: sc.className });
      studentClassesMap.set(sc.studentId, list);
    }

    // Filter students by classId or track if requested
    let targetStudents = allInstituteStudents;

    if (query.classId) {
      targetStudents = targetStudents.filter((s) => {
        const cList = studentClassesMap.get(s.id);
        return cList?.some((c) => c.id === query.classId);
      });
    }

    if (query.track === 'intensive') {
      targetStudents = targetStudents.filter((s) => intensiveIds.has(s.id));
    } else if (query.track === 'regular') {
      targetStudents = targetStudents.filter((s) => !intensiveIds.has(s.id));
    }

    if (targetStudents.length === 0) {
      return {
        instituteId,
        startDate,
        endDate,
        totalStudents: 0,
        summary: {
          averageAttendanceRate: 0,
          totalDinarsGained: 0,
          totalDinarsLost: 0,
          totalAyahsRecited: 0,
          studentsWithRecitations: 0,
        },
        students: [],
      };
    }

    const studentIds = targetStudents.map((s) => s.id);

    // 4. Batch query Attendance in period
    const attendanceRows = await this.db
      .select({
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(
        attendanceSessions,
        eq(attendanceSessions.id, attendanceRecords.sessionId),
      )
      .where(
        and(
          eq(attendanceSessions.instituteId, instituteId),
          inArray(attendanceRecords.studentId, studentIds),
          gte(attendanceSessions.date, startDate),
          lte(attendanceSessions.date, endDate),
        ),
      );

    const attendanceStatsMap = new Map<
      string,
      { present: number; late: number; justified: number; absent: number }
    >();
    for (const r of attendanceRows) {
      const entry = attendanceStatsMap.get(r.studentId) || {
        present: 0,
        late: 0,
        justified: 0,
        absent: 0,
      };
      if (r.status === 'present') entry.present++;
      else if (r.status === 'late') entry.late++;
      else if (r.status === 'justified') entry.justified++;
      else if (r.status === 'absent') entry.absent++;
      attendanceStatsMap.set(r.studentId, entry);
    }

    // 5. Batch query Dinars in period (positive amount = gained, negative = lost, exclude reversed)
    const dinarRows = await this.db
      .select({
        studentId: dinarTransactions.studentId,
        amount: dinarTransactions.amount,
      })
      .from(dinarTransactions)
      .where(
        and(
          eq(dinarTransactions.instituteId, instituteId),
          inArray(dinarTransactions.studentId, studentIds),
          gte(dinarTransactions.createdAt, startDateTime),
          lte(dinarTransactions.createdAt, endDateTime),
          isNull(dinarTransactions.reversedAt),
        ),
      );

    const dinarsMap = new Map<string, { gained: number; lost: number }>();
    for (const d of dinarRows) {
      const entry = dinarsMap.get(d.studentId) || { gained: 0, lost: 0 };
      if (d.amount > 0) {
        entry.gained += d.amount;
      } else if (d.amount < 0) {
        entry.lost += Math.abs(d.amount);
      }
      dinarsMap.set(d.studentId, entry);
    }

    // 6. Batch query Recitations in period
    const recitationRows = await this.db
      .select({
        studentId: recitations.studentId,
        surahNumber: recitations.surahNumber,
        fromAyah: recitations.fromAyah,
        toAyah: recitations.toAyah,
      })
      .from(recitations)
      .where(
        and(
          eq(recitations.instituteId, instituteId),
          inArray(recitations.studentId, studentIds),
          gte(recitations.createdAt, startDateTime),
          lte(recitations.createdAt, endDateTime),
        ),
      );

    // Map studentId -> surahNumber -> Set of unique ayahs recited in period
    const studentRecitationsMap = new Map<
      string,
      {
        totalSessions: number;
        surahsMap: Map<number, Set<number>>;
      }
    >();

    for (const rec of recitationRows) {
      let stRec = studentRecitationsMap.get(rec.studentId);
      if (!stRec) {
        stRec = { totalSessions: 0, surahsMap: new Map() };
        studentRecitationsMap.set(rec.studentId, stRec);
      }
      stRec.totalSessions++;

      let ayahSet = stRec.surahsMap.get(rec.surahNumber);
      if (!ayahSet) {
        ayahSet = new Set<number>();
        stRec.surahsMap.set(rec.surahNumber, ayahSet);
      }

      for (let i = rec.fromAyah; i <= rec.toAyah; i++) {
        ayahSet.add(i);
      }
    }

    // 7. Assemble students achievement items
    let grandTotalDinarsGained = 0;
    let grandTotalDinarsLost = 0;
    let grandTotalAyahsRecited = 0;
    let totalAttendanceRateSum = 0;
    let studentsWithAttRate = 0;
    let studentsWithRecitations = 0;

    const studentItems: StudentAchievementItem[] = targetStudents.map((s) => {
      // Classes
      const cList = studentClassesMap.get(s.id) || [];
      const className = cList.length > 0 ? cList.map((c) => c.name).join('، ') : 'بدون حلقة';
      const classIds = cList.map((c) => c.id);
      const isIntensive = intensiveIds.has(s.id);

      // Attendance
      const att = attendanceStatsMap.get(s.id) || {
        present: 0,
        late: 0,
        justified: 0,
        absent: 0,
      };
      const totalSessions = att.present + att.late + att.justified + att.absent;
      const rate =
        totalSessions > 0
          ? Math.round(((att.present + att.late) / totalSessions) * 100)
          : 0;

      if (totalSessions > 0) {
        totalAttendanceRateSum += rate;
        studentsWithAttRate++;
      }

      // Dinars
      const dinar = dinarsMap.get(s.id) || { gained: 0, lost: 0 };
      grandTotalDinarsGained += dinar.gained;
      grandTotalDinarsLost += dinar.lost;

      // Recitations
      const rec = studentRecitationsMap.get(s.id);
      const surahsList: StudentAchievementItem['recitation']['surahs'] = [];
      let totalStudentAyahs = 0;

      if (rec && rec.surahsMap.size > 0) {
        studentsWithRecitations++;
        for (const [sNumber, ayahSet] of rec.surahsMap.entries()) {
          const surahMeta = getSurah(sNumber);
          const totalAyahs = surahMeta ? surahMeta.ayahCount : 1;
          const sName = surahMeta ? surahMeta.name : `سورة ${sNumber}`;
          const ayahsCount = ayahSet.size;
          totalStudentAyahs += ayahsCount;
          const percent = Math.min(
            100,
            Math.round((ayahsCount / totalAyahs) * 100),
          );

          surahsList.push({
            number: sNumber,
            name: sName,
            ayahsRecited: ayahsCount,
            surahTotalAyahs: totalAyahs,
            percent,
          });
        }
      }

      grandTotalAyahsRecited += totalStudentAyahs;

      // Format surahs summary: e.g. "البقرة (20%)، آل عمران (90%)"
      const surahsSummary =
        surahsList.length > 0
          ? surahsList.map((su) => `${su.name} (${su.percent}%)`).join('، ')
          : '—';

      return {
        studentId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        username: s.username.toString(),
        phone: s.phone ?? null,
        schoolGrade: s.schoolGrade ?? null,
        className,
        classIds,
        track: isIntensive ? 'intensive' : 'regular',
        attendance: {
          rate,
          present: att.present,
          late: att.late,
          justified: att.justified,
          absent: att.absent,
          totalSessions,
        },
        dinars: {
          gained: dinar.gained,
          lost: dinar.lost,
          net: dinar.gained - dinar.lost,
        },
        recitation: {
          totalAyahs: totalStudentAyahs,
          totalSessions: rec?.totalSessions ?? 0,
          surahsSummary,
          surahs: surahsList,
        },
      };
    });

    const averageAttendanceRate =
      studentsWithAttRate > 0
        ? Math.round(totalAttendanceRateSum / studentsWithAttRate)
        : 0;

    return {
      instituteId,
      startDate,
      endDate,
      totalStudents: studentItems.length,
      summary: {
        averageAttendanceRate,
        totalDinarsGained: grandTotalDinarsGained,
        totalDinarsLost: grandTotalDinarsLost,
        totalAyahsRecited: grandTotalAyahsRecited,
        studentsWithRecitations,
      },
      students: studentItems,
    };
  }
}
