import { Institute } from '../../domain/institute.entity';

export class InstituteResponseDto {
  id: string;
  name: string;
  place: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;

  static fromDomain(institute: Institute): InstituteResponseDto {
    const dto = new InstituteResponseDto();
    dto.id = institute.id;
    dto.name = institute.name;
    dto.place = institute.place;
    dto.description = institute.description;
    dto.logoUrl = institute.logoUrl;
    dto.createdAt = institute.createdAt.toISOString();
    return dto;
  }
}
