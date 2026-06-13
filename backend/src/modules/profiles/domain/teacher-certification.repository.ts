import { TeacherCertification } from './teacher-certification.entity';

export const CERTIFICATION_REPOSITORY = Symbol('CERTIFICATION_REPOSITORY');

export interface TeacherCertificationRepository {
  save(certification: TeacherCertification): Promise<void>;
  findById(id: string): Promise<TeacherCertification | null>;
  findByTeacher(teacherId: string): Promise<TeacherCertification[]>;
  delete(id: string): Promise<void>;
}
