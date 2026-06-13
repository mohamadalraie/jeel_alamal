import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Manager account details, created together with the institute (spec 001). */
export class CreateManagerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateInstituteDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  place: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Absolute URL or a relative /uploads path produced by the upload endpoint.
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ValidateNested()
  @Type(() => CreateManagerDto)
  manager: CreateManagerDto;
}
