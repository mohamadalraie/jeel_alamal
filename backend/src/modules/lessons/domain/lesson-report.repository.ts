import { LessonReport } from './lesson-report.entity';

export const LESSON_REPORT_REPOSITORY = Symbol('LESSON_REPORT_REPOSITORY');

export interface LessonReportRepository {
  findByBindingId(lessonClassId: string): Promise<LessonReport | null>;
  findById(id: string): Promise<LessonReport | null>;
  save(report: LessonReport): Promise<void>;
  update(report: LessonReport): Promise<void>;
}
