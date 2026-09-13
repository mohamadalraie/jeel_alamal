import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Teacher account details (spec 001). */
export class CreateTeacherDto {
  @IsOptional()
  @IsString()
  existingUserId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

/** Student account details (spec 001) — adds school grade. */
export class CreateStudentDto extends CreateTeacherDto {
  @IsOptional()
  @IsString()
  schoolGrade?: string;
}
