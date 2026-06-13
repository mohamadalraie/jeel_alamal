import { StudentNote } from './student-note.entity';

export const STUDENT_NOTE_REPOSITORY = Symbol('STUDENT_NOTE_REPOSITORY');

export interface StudentNoteRepository {
  save(note: StudentNote): Promise<void>;
  findById(id: string): Promise<StudentNote | null>;
  findByStudent(studentId: string): Promise<StudentNote[]>;
  delete(id: string): Promise<void>;
}
