import { Class } from './class.entity';
import { ScheduleSlot } from './class-schedule';

export const CLASS_REPOSITORY = Symbol('CLASS_REPOSITORY');

export interface ClassMembership {
  teacherIds: string[];
  supervisorId: string | null;
  studentIds: string[];
  intensiveStudentIds: string[];
}

export type StoredSlot = ScheduleSlot & { id: string };

export interface ClassRepository {
  save(klass: Class): Promise<void>;
  findById(id: string): Promise<Class | null>;
  findAllByInstitute(
    instituteId: string,
    track?: 'regular' | 'intensive',
  ): Promise<Class[]>;
  getMembership(classId: string): Promise<ClassMembership>;
  addTeacher(classId: string, teacherId: string): Promise<void>;
  isTeacherOfClass(classId: string, teacherId: string): Promise<boolean>;
  /** Atomically clears the current supervisor flag and sets the new one. */
  setSupervisor(classId: string, teacherId: string): Promise<void>;
  addStudent(classId: string, studentId: string): Promise<void>;
  isStudentOfClass(classId: string, studentId: string): Promise<boolean>;
  /** Intensive track enrollment methods */
  addIntensiveStudent(classId: string, studentId: string): Promise<void>;
  removeIntensiveStudent(classId: string, studentId: string): Promise<void>;
  isIntensiveStudentOfClass(classId: string, studentId: string): Promise<boolean>;
  /** BR-3: is this student already enrolled in ANY intensive class? */
  isStudentInAnyIntensiveClass(studentId: string): Promise<boolean>;
  getIntensiveStudentIds(classId: string): Promise<string[]>;
  /** Classes a teacher belongs to, scoped to one institute (profile view). */
  findClassesByTeacher(teacherId: string): Promise<Class[]>;
  /** The single class a student is currently in, if any (spec 002: one at a time). */
  findCurrentClassOfStudent(studentId: string): Promise<Class | null>;
  /**
   * Transfer: drop the student's existing enrollment(s) and add the new one in
   * one transaction. Passing null target only removes (un-enroll).
   */
  transferStudent(studentId: string, toClassId: string | null): Promise<void>;

  // ── spec 003: class CRUD + schedule ──
  delete(classId: string): Promise<void>;
  removeTeacher(classId: string, teacherId: string): Promise<void>;
  removeStudent(classId: string, studentId: string): Promise<void>;
  getSchedule(classId: string): Promise<StoredSlot[]>;
  /** Replace the whole weekly schedule for a class (transactional). */
  setSchedule(classId: string, slots: ScheduleSlot[]): Promise<void>;

  // ── spec 004 ──
  /** Detach a user from every class (used on soft-delete). */
  removeMemberFromAllClasses(userId: string): Promise<void>;
  /** Student ids of an institute that are not enrolled in any class. */
  findStudentIdsWithoutClass(instituteId: string): Promise<string[]>;
  /** Student ids of an institute enrolled in a regular class but not yet in an intensive class. */
  findStudentIdsEligibleForIntensive(instituteId: string): Promise<string[]>;
  /** Counts for the institute statistics page. */
  countClasses(instituteId: string): Promise<number>;
}
