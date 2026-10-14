import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../../../core/database/drizzle.provider';
import { LessonReport } from '../../domain/lesson-report.entity';
import type { LessonReportRepository } from '../../domain/lesson-report.repository';
import { lessonReports, type LessonReportRow } from './lesson-report.schema';

const toReport = (r: LessonReportRow): LessonReport =>
  LessonReport.reconstitute(r.id, {
    lessonClassId: r.lessonClassId,
    mainIdeas: r.mainIdeas,
    positives: r.positives,
    negatives: r.negatives,
    teacherNotes: r.teacherNotes,
    submittedBy: r.submittedBy,
    webhookStatus: r.webhookStatus,
    webhookError: r.webhookError,
    webhookSentAt: r.webhookSentAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

@Injectable()
export class DrizzleLessonReportRepository implements LessonReportRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findByBindingId(lessonClassId: string): Promise<LessonReport | null> {
    const [row] = await this.db
      .select()
      .from(lessonReports)
      .where(eq(lessonReports.lessonClassId, lessonClassId))
      .limit(1);
    return row ? toReport(row) : null;
  }

  async findById(id: string): Promise<LessonReport | null> {
    const [row] = await this.db
      .select()
      .from(lessonReports)
      .where(eq(lessonReports.id, id))
      .limit(1);
    return row ? toReport(row) : null;
  }

  async save(report: LessonReport): Promise<void> {
    await this.db.insert(lessonReports).values({
      id: report.id,
      lessonClassId: report.lessonClassId,
      mainIdeas: report.mainIdeas,
      positives: report.positives,
      negatives: report.negatives,
      teacherNotes: report.teacherNotes,
      submittedBy: report.submittedBy,
      webhookStatus: report.webhookStatus,
      webhookError: report.webhookError,
      webhookSentAt: report.webhookSentAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
  }

  async update(report: LessonReport): Promise<void> {
    await this.db
      .update(lessonReports)
      .set({
        mainIdeas: report.mainIdeas,
        positives: report.positives,
        negatives: report.negatives,
        teacherNotes: report.teacherNotes,
        webhookStatus: report.webhookStatus,
        webhookError: report.webhookError,
        webhookSentAt: report.webhookSentAt,
        updatedAt: report.updatedAt,
      })
      .where(eq(lessonReports.id, report.id));
  }
}
