import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateInstituteDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  place: string;

  @IsOptional()
  @IsString()
  description?: string;

  // May be an absolute URL or a relative /uploads path (relaxed from @IsUrl).
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
