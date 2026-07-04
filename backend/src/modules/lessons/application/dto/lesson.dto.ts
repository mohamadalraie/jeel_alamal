import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LessonKind } from '../../domain/lesson-kind';
import { LessonSourceKind } from '../../domain/lesson-source-kind';

// ── Categories ──
export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsHexColor()
  color: string;
}

export class UpdateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsHexColor()
  color: string;
}

// ── Lessons ──
export class LessonSourceDto {
  @IsEnum(LessonSourceKind)
  kind: LessonSourceKind;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class LessonAssignmentDto {
  @IsUUID()
  classId: string;

  @IsUUID()
  teacherId: string;
}

export class CreateLessonDto {
  @IsEnum(LessonKind)
  kind: LessonKind;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonSourceDto)
  sources?: LessonSourceDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LessonAssignmentDto)
  assignments: LessonAssignmentDto[];
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonSourceDto)
  sources?: LessonSourceDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LessonAssignmentDto)
  assignments?: LessonAssignmentDto[];
}

export class ReorderDayDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsArray()
  @IsUUID('all', { each: true })
  orderedLessonClassIds: string[];
}

export class SetLessonsVisibilityDto {
  visible: boolean;
}

// ── Read models returned to the presentation layer ──
export interface CategoryView {
  id: string;
  name: string;
  color: string;
}

export interface ProgramEntryView {
  lessonClassId: string;
  lessonId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  category: CategoryView | null;
  date: string;
  sort: number;
  teacher: { id: string; name: string };
  className: string;
  sources: { kind: LessonSourceKind; url: string; description: string | null }[];
}

export interface ClassProgramResult {
  lessonsVisibleToStudents: boolean;
  entries: ProgramEntryView[];
}

export interface TeacherProgramEntry extends ProgramEntryView {
  isNext: boolean;
}

export interface StudentLessonView {
  lessonClassId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  date: string;
}

/** One lesson in the institute-wide hub, grouped across the classes it serves. */
export interface InstituteLessonView {
  lessonId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  category: CategoryView | null;
  date: string;
  sources: { kind: LessonSourceKind; url: string; description: string | null }[];
  classes: { lessonClassId: string; classId: string; className: string; teacher: { id: string; name: string } }[];
}
