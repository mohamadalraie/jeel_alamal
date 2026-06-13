import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { TeacherCertification } from '../../domain/teacher-certification.entity';
import type { TeacherCertificationRepository } from '../../domain/teacher-certification.repository';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { teacherCertifications } from './profile.schema';

@Injectable()
export class DrizzleCertificationRepository
  implements TeacherCertificationRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(cert: TeacherCertification): Promise<void> {
    await this.db.insert(teacherCertifications).values({
      id: cert.id,
      teacherId: cert.teacherId,
      title: cert.title,
      createdAt: cert.createdAt,
    });
  }

  async findById(id: string): Promise<TeacherCertification | null> {
    const [row] = await this.db
      .select()
      .from(teacherCertifications)
      .where(eq(teacherCertifications.id, id))
      .limit(1);
    return row
      ? TeacherCertification.reconstitute(row.id, {
          teacherId: row.teacherId,
          title: row.title,
          createdAt: row.createdAt,
        })
      : null;
  }

  async findByTeacher(teacherId: string): Promise<TeacherCertification[]> {
    const rows = await this.db
      .select()
      .from(teacherCertifications)
      .where(eq(teacherCertifications.teacherId, teacherId))
      .orderBy(desc(teacherCertifications.createdAt));
    return rows.map((row) =>
      TeacherCertification.reconstitute(row.id, {
        teacherId: row.teacherId,
        title: row.title,
        createdAt: row.createdAt,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(teacherCertifications)
      .where(eq(teacherCertifications.id, id));
  }
}
