import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, inArray, isNull, notInArray } from 'drizzle-orm';
import { Class } from '../../domain/class.entity';
import type {
  ClassMembership,
  ClassRepository,
  StoredSlot,
} from '../../domain/class.repository';
import type {
  AnchorKind,
  ScheduleSlot,
  Weekday,
} from '../../domain/class-schedule';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import {
  classes,
  classIntensiveStudents,
  classSchedule,
  classStudents,
  classTeachers,
  type ClassRow,
} from './class.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

const toDomain = (row: ClassRow): Class =>
  Class.reconstitute(row.id, {
    instituteId: row.instituteId,
    name: row.name,
    description: row.description,
    lessonsVisibleToStudents: row.lessonsVisibleToStudents,
    isIntensive: row.isIntensive ?? false,
    createdAt: row.createdAt,
  });

@Injectable()
export class DrizzleClassRepository implements ClassRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(klass: Class): Promise<void> {
    const row: ClassRow = {
      id: klass.id,
      instituteId: klass.instituteId,
      name: klass.name,
      description: klass.description,
      lessonsVisibleToStudents: klass.lessonsVisibleToStudents,
      isIntensive: klass.isIntensive,
      createdAt: klass.createdAt,
    };
    await this.db
      .insert(classes)
      .values(row)
      .onConflictDoUpdate({ target: classes.id, set: row });
  }

  async findById(id: string): Promise<Class | null> {
    const [row] = await this.db
      .select()
      .from(classes)
      .where(eq(classes.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findAllByInstitute(
    instituteId: string,
    track?: 'regular' | 'intensive',
  ): Promise<Class[]> {
    const conditions = [eq(classes.instituteId, instituteId)];
    if (track === 'regular') {
      conditions.push(eq(classes.isIntensive, false));
    } else if (track === 'intensive') {
      conditions.push(eq(classes.isIntensive, true));
    }

    const rows = await this.db
      .select()
      .from(classes)
      .where(and(...conditions))
      .orderBy(desc(classes.createdAt));
    return rows.map(toDomain);
  }

  async getMembership(classId: string): Promise<ClassMembership> {
    const teachers = await this.db
      .select({
        teacherId: classTeachers.teacherId,
        isSupervisor: classTeachers.isSupervisor,
      })
      .from(classTeachers)
      .where(eq(classTeachers.classId, classId));
    const students = await this.db
      .select({ studentId: classStudents.studentId })
      .from(classStudents)
      .where(eq(classStudents.classId, classId));
    const intensiveStudents = await this.db
      .select({ studentId: classIntensiveStudents.studentId })
      .from(classIntensiveStudents)
      .where(eq(classIntensiveStudents.classId, classId));
    return {
      teacherIds: teachers.map((t) => t.teacherId),
      supervisorId: teachers.find((t) => t.isSupervisor)?.teacherId ?? null,
      studentIds: students.map((s) => s.studentId),
      intensiveStudentIds: intensiveStudents.map((s) => s.studentId),
    };
  }

  async addTeacher(classId: string, teacherId: string): Promise<void> {
    await this.db
      .insert(classTeachers)
      .values({ classId, teacherId, isSupervisor: false, addedAt: new Date() })
      .onConflictDoNothing();
  }

  async isTeacherOfClass(classId: string, teacherId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ teacherId: classTeachers.teacherId })
      .from(classTeachers)
      .where(
        and(
          eq(classTeachers.classId, classId),
          eq(classTeachers.teacherId, teacherId),
        ),
      )
      .limit(1);
    return !!row;
  }

  /** Clear-then-set inside a transaction; the partial unique index is the net. */
  async setSupervisor(classId: string, teacherId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(classTeachers)
        .set({ isSupervisor: false })
        .where(eq(classTeachers.classId, classId));
      await tx
        .update(classTeachers)
        .set({ isSupervisor: true })
        .where(
          and(
            eq(classTeachers.classId, classId),
            eq(classTeachers.teacherId, teacherId),
          ),
        );
    });
  }

  async addStudent(classId: string, studentId: string): Promise<void> {
    await this.db
      .insert(classStudents)
      .values({ classId, studentId, enrolledAt: new Date() })
      .onConflictDoNothing();
  }

  async isStudentOfClass(classId: string, studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ studentId: classStudents.studentId })
      .from(classStudents)
      .where(
        and(
          eq(classStudents.classId, classId),
          eq(classStudents.studentId, studentId),
        ),
      )
      .limit(1);
    return !!row;
  }

  async addIntensiveStudent(classId: string, studentId: string): Promise<void> {
    await this.db
      .insert(classIntensiveStudents)
      .values({ classId, studentId, addedAt: new Date() })
      .onConflictDoNothing();
  }

  async removeIntensiveStudent(
    classId: string,
    studentId: string,
  ): Promise<void> {
    await this.db
      .delete(classIntensiveStudents)
      .where(
        and(
          eq(classIntensiveStudents.classId, classId),
          eq(classIntensiveStudents.studentId, studentId),
        ),
      );
  }

  async isIntensiveStudentOfClass(
    classId: string,
    studentId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ studentId: classIntensiveStudents.studentId })
      .from(classIntensiveStudents)
      .where(
        and(
          eq(classIntensiveStudents.classId, classId),
          eq(classIntensiveStudents.studentId, studentId),
        ),
      )
      .limit(1);
    return !!row;
  }


  async isStudentInAnyIntensiveClass(studentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ studentId: classIntensiveStudents.studentId })
      .from(classIntensiveStudents)
      .where(eq(classIntensiveStudents.studentId, studentId))
      .limit(1);
    return !!row;
  }

  async getIntensiveStudentIds(classId: string): Promise<string[]> {
    const rows = await this.db
      .select({ studentId: classIntensiveStudents.studentId })
      .from(classIntensiveStudents)
      .where(eq(classIntensiveStudents.classId, classId));
    return rows.map((r) => r.studentId);
  }

  async findClassesByTeacher(teacherId: string): Promise<Class[]> {
    const rows = await this.db
      .select({ klass: classes })
      .from(classTeachers)
      .innerJoin(classes, eq(classTeachers.classId, classes.id))
      .where(eq(classTeachers.teacherId, teacherId))
      .orderBy(desc(classes.createdAt));
    return rows.map((r) => toDomain(r.klass));
  }

  async findCurrentClassOfStudent(studentId: string): Promise<Class | null> {
    const [row] = await this.db
      .select({ klass: classes })
      .from(classStudents)
      .innerJoin(classes, eq(classStudents.classId, classes.id))
      .where(eq(classStudents.studentId, studentId))
      .orderBy(desc(classStudents.enrolledAt))
      .limit(1);
    return row ? toDomain(row.klass) : null;
  }

  async transferStudent(
    studentId: string,
    toClassId: string | null,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(classStudents)
        .where(eq(classStudents.studentId, studentId));
      await tx
        .delete(classIntensiveStudents)
        .where(eq(classIntensiveStudents.studentId, studentId));
      if (toClassId) {
        await tx
          .insert(classStudents)
          .values({ classId: toClassId, studentId, enrolledAt: new Date() })
          .onConflictDoNothing();
      }
    });
  }

  async delete(classId: string): Promise<void> {
    await this.db.delete(classes).where(eq(classes.id, classId));
  }

  async removeTeacher(classId: string, teacherId: string): Promise<void> {
    await this.db
      .delete(classTeachers)
      .where(
        and(
          eq(classTeachers.classId, classId),
          eq(classTeachers.teacherId, teacherId),
        ),
      );
  }

  async removeStudent(classId: string, studentId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(classStudents)
        .where(
          and(
            eq(classStudents.classId, classId),
            eq(classStudents.studentId, studentId),
          ),
        );
      await tx
        .delete(classIntensiveStudents)
        .where(
          and(
            eq(classIntensiveStudents.classId, classId),
            eq(classIntensiveStudents.studentId, studentId),
          ),
        );
    });
  }

  async getSchedule(classId: string): Promise<StoredSlot[]> {
    const rows = await this.db
      .select()
      .from(classSchedule)
      .where(eq(classSchedule.classId, classId));
    return rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      start: { kind: r.startKind, value: r.startValue },
      end: r.endKind ? { kind: r.endKind, value: r.endValue ?? '' } : null,
      trackType: r.trackType ?? 'regular',
    }));
  }

  async setSchedule(classId: string, slots: ScheduleSlot[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(classSchedule).where(eq(classSchedule.classId, classId));
      if (slots.length > 0) {
        await tx.insert(classSchedule).values(
          slots.map((s) => ({
            id: randomUUID(),
            classId,
            dayOfWeek: s.dayOfWeek,
            startKind: s.start.kind,
            startValue: s.start.value,
            endKind: s.end?.kind ?? null,
            endValue: s.end?.value ?? null,
            trackType: s.trackType ?? 'regular',
          })),
        );
      }
    });
  }

  async removeMemberFromAllClasses(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(classTeachers).where(eq(classTeachers.teacherId, userId));
      await tx.delete(classStudents).where(eq(classStudents.studentId, userId));
      await tx
        .delete(classIntensiveStudents)
        .where(eq(classIntensiveStudents.studentId, userId));
    });
  }

  async findStudentIdsWithoutClass(instituteId: string): Promise<string[]> {
    // Institute students whose id is absent from class_students.
    const enrolled = this.db
      .select({ id: classStudents.studentId })
      .from(classStudents);
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.instituteId, instituteId),
          eq(users.role, 'student'),
          isNull(users.deletedAt),
          notInArray(users.id, enrolled),
        ),
      );
    return rows.map((r) => r.id);
  }

  async findStudentIdsEligibleForIntensive(instituteId: string): Promise<string[]> {
    // Institute students enrolled in regular class (class_students) but NOT in class_intensive_students.
    const regularEnrolled = this.db
      .select({ id: classStudents.studentId })
      .from(classStudents);
    const intensiveEnrolled = this.db
      .select({ id: classIntensiveStudents.studentId })
      .from(classIntensiveStudents);

    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.instituteId, instituteId),
          eq(users.role, 'student'),
          isNull(users.deletedAt),
          inArray(users.id, regularEnrolled),
          notInArray(users.id, intensiveEnrolled),
        ),
      );
    return rows.map((r) => r.id);
  }

  async countClasses(instituteId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(classes)
      .where(eq(classes.instituteId, instituteId));
    return Number(row?.n ?? 0);
  }
}
