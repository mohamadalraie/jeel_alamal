import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Class } from '../../domain/class.entity';
import { ClassMembership } from '../../domain/class.repository';

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class MemberIdDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

export class ClassResponseDto {
  id: string;
  instituteId: string;
  name: string;
  description: string | null;
  createdAt: string;
  teacherIds: string[];
  supervisorId: string | null;
  studentIds: string[];

  static fromDomain(klass: Class, membership: ClassMembership): ClassResponseDto {
    const dto = new ClassResponseDto();
    dto.id = klass.id;
    dto.instituteId = klass.instituteId;
    dto.name = klass.name;
    dto.description = klass.description;
    dto.createdAt = klass.createdAt.toISOString();
    dto.teacherIds = membership.teacherIds;
    dto.supervisorId = membership.supervisorId;
    dto.studentIds = membership.studentIds;
    return dto;
  }
}
