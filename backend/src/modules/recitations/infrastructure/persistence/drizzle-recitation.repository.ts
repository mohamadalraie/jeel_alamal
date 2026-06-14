import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { Recitation } from '../../domain/recitation.entity';
import { RecitationRating } from '../../domain/recitation-rating';
import type { RecitationRepository } from '../../domain/recitation.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { recitations, type RecitationRow } from './recitation.schema';

const toDomain = (r: RecitationRow): Recitation =>
  Recitation.reconstitute(r.id, {
    instituteId: r.instituteId,
    studentId: r.studentId,
    surahNumber: r.surahNumber,
    fromAyah: r.fromAyah,
    toAyah: r.toAyah,
    rating: r.rating as RecitationRating,
    recitedBy: r.recitedBy,
    createdAt: r.createdAt,
  });

@Injectable()
export class DrizzleRecitationRepository implements RecitationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(r: Recitation): Promise<void> {
    await this.db.insert(recitations).values({
      id: r.id,
      instituteId: r.instituteId,
      studentId: r.studentId,
      surahNumber: r.surahNumber,
      fromAyah: r.fromAyah,
      toAyah: r.toAyah,
      rating: r.rating,
      recitedBy: r.recitedBy,
      createdAt: r.createdAt,
    });
  }

  async findByStudent(studentId: string): Promise<Recitation[]> {
    const rows = await this.db
      .select()
      .from(recitations)
      .where(eq(recitations.studentId, studentId))
      .orderBy(desc(recitations.createdAt));
    return rows.map(toDomain);
  }

  async findByStudents(studentIds: string[]): Promise<Recitation[]> {
    if (studentIds.length === 0) return [];
    const rows = await this.db
      .select()
      .from(recitations)
      .where(inArray(recitations.studentId, studentIds))
      .orderBy(desc(recitations.createdAt));
    return rows.map(toDomain);
  }
}
