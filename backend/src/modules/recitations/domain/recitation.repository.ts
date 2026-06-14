import { Recitation } from './recitation.entity';

export const RECITATION_REPOSITORY = Symbol('RECITATION_REPOSITORY');

export interface RecitationRepository {
  save(recitation: Recitation): Promise<void>;
  /** All recitations for one student, newest first. */
  findByStudent(studentId: string): Promise<Recitation[]>;
  /** Recitations for many students (class view), newest first. */
  findByStudents(studentIds: string[]): Promise<Recitation[]>;
}
