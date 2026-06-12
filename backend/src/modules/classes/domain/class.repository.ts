import { Class } from './class.entity';

export const CLASS_REPOSITORY = Symbol('CLASS_REPOSITORY');

export interface ClassMembership {
  teacherIds: string[];
  supervisorId: string | null;
  studentIds: string[];
}

export interface ClassRepository {
  save(klass: Class): Promise<void>;
  findById(id: string): Promise<Class | null>;
  findAllByInstitute(instituteId: string): Promise<Class[]>;
  getMembership(classId: string): Promise<ClassMembership>;
  addTeacher(classId: string, teacherId: string): Promise<void>;
  isTeacherOfClass(classId: string, teacherId: string): Promise<boolean>;
  /** Atomically clears the current supervisor flag and sets the new one. */
  setSupervisor(classId: string, teacherId: string): Promise<void>;
  addStudent(classId: string, studentId: string): Promise<void>;
  isStudentOfClass(classId: string, studentId: string): Promise<boolean>;
}
