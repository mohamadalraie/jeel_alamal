import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { Class } from '../../domain/class.entity';
import type {
  ClassMembership,
  ClassRepository,
  StoredSlot,
} from '../../domain/class.repository';
import type { ScheduleSlot, Weekday } from '../../domain/class-schedule';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import {
  classes,
  classSchedule,
  classStudents,
  classTeachers,
  type ClassRow,
} from './class.schema';

const toDomain = (row: ClassRow): Class =>
  Class.reconstitute(row.id, {
    instituteId: row.instituteId,
    name: row.name,
    description: row.description,
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

  async findAllByInstitute(instituteId: string): Promise<Class[]> {
    const rows = await this.db
      .select()
      .from(classes)
      .where(eq(classes.instituteId, instituteId))
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
    return {
      teacherIds: teachers.map((t) => t.teacherId),
      supervisorId: teachers.find((t) => t.isSupervisor)?.teacherId ?? null,
      studentIds: students.map((s) => s.studentId),
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
    await this.db
      .delete(classStudents)
      .where(
        and(
          eq(classStudents.classId, classId),
          eq(classStudents.studentId, studentId),
        ),
      );
  }

  async getSchedule(classId: string): Promise<StoredSlot[]> {
    const rows = await this.db
      .select()
      .from(classSchedule)
      .where(eq(classSchedule.classId, classId));
    return rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek as Weekday,
      startTime: r.startTime,
      endTime: r.endTime,
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
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        );
      }
    });
  }
}
