import { IsOptional, IsString, MinLength } from 'class-validator';
import type { LessonReportWebhookStatus } from '../../domain/lesson-report.entity';

export class SubmitLessonReportDto {
  @IsString()
  @MinLength(1, { message: 'المحاور والأفكار الأساسية مطلوبة' })
  mainIdeas: string;

  @IsOptional()
  @IsString()
  positives?: string;

  @IsOptional()
  @IsString()
  negatives?: string;

  @IsOptional()
  @IsString()
  teacherNotes?: string;
}

export class UpdateLessonReportDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  mainIdeas?: string;

  @IsOptional()
  @IsString()
  positives?: string;

  @IsOptional()
  @IsString()
  negatives?: string;
}

export interface LessonReportView {
  id: string;
  lessonClassId: string;
  lessonId: string;
  lessonTitle: string | null;
  subjectName: string | null;
  className: string;
  teacherName: string | null;
  date: string;
  actualDurationMinutes: number | null;
  expectedDurationMinutes: number | null;
  mainIdeas: string;
  positives?: string | null;
  negatives?: string | null;
  teacherNotes?: string | null;
  submittedBy: string;
  webhookStatus: LessonReportWebhookStatus;
  webhookError?: string | null;
  webhookSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}
