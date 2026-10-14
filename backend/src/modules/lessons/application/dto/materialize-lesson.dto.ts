import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { LessonKind } from '../../domain/lesson-kind';

export class MaterializeScheduledLessonDto {
  @IsUUID()
  classId: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsOptional()
  @IsUUID()
  scheduleSlotId?: string;

  @IsEnum(LessonKind)
  kind: LessonKind;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  startImmediately?: boolean;
}

export interface MaterializeResult {
  lessonId: string;
  lessonClassId: string;
  started: boolean;
}
