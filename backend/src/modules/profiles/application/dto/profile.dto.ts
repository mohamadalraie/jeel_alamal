import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  StudyDegree,
  TajweedLevel,
} from '../../../../shared/domain/teacher-attributes';

const PHONE = /^\+?[0-9]{7,15}$/;

/** Shared basic-profile edit payload (teacher or student). */
export class UpdateBasicInfoDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  birthDate: string;

  @Matches(PHONE, { message: 'Phone must be 7–15 digits, optional leading +' })
  phone: string;

  @IsOptional()
  @IsString()
  schoolGrade?: string;
}

/** Teacher extended details (manager/super_admin only). */
export class UpdateTeacherDetailsDto {
  @IsOptional()
  @IsEnum(StudyDegree)
  studyDegree?: StudyDegree;

  @IsOptional()
  @IsString()
  studyField?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  quranPartsMemorized?: number;

  @IsOptional()
  @IsEnum(TajweedLevel)
  tajweedLevel?: TajweedLevel;
}

export class AddCertificationDto {
  @IsString()
  @MinLength(2)
  title: string;
}

export class NoteBodyDto {
  @IsString()
  @MinLength(1)
  body: string;
}

export class ChangeClassDto {
  @IsOptional()
  @IsString()
  classId?: string | null;
}

export class CertificationDto {
  id: string;
  title: string;
  createdAt: string;
}

export class NoteDto {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}
