import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { StudentNote } from '../../domain/student-note.entity';
import type { StudentNoteRepository } from '../../domain/student-note.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { studentNotes } from './profile.schema';

const toDomain = (row: typeof studentNotes.$inferSelect): StudentNote =>
  StudentNote.reconstitute(row.id, {
    studentId: row.studentId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

@Injectable()
export class DrizzleStudentNoteRepository implements StudentNoteRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(note: StudentNote): Promise<void> {
    const row = {
      id: note.id,
      studentId: note.studentId,
      authorId: note.authorId,
      body: note.body,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
    await this.db
      .insert(studentNotes)
      .values(row)
      .onConflictDoUpdate({
        target: studentNotes.id,
        set: { body: row.body, updatedAt: row.updatedAt },
      });
  }

  async findById(id: string): Promise<StudentNote | null> {
    const [row] = await this.db
      .select()
      .from(studentNotes)
      .where(eq(studentNotes.id, id))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async findByStudent(studentId: string): Promise<StudentNote[]> {
    const rows = await this.db
      .select()
      .from(studentNotes)
      .where(eq(studentNotes.studentId, studentId))
      .orderBy(desc(studentNotes.createdAt));
    return rows.map(toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(studentNotes).where(eq(studentNotes.id, id));
  }
}
