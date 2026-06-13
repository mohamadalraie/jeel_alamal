import { User } from '../../domain/user.entity';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  StudyDegree,
  TajweedLevel,
} from '../../../../shared/domain/teacher-attributes';

export interface TeacherDetailsDto {
  studyDegree: StudyDegree | null;
  studyField: string | null;
  quranPartsMemorized: number | null;
  tajweedLevel: TajweedLevel | null;
}

/**
 * Transport-safe shape of a user — the passwordHash never crosses this
 * boundary. Teacher extended details are included only when the caller passes
 * `withDetails` (the use-case decides based on the actor's permission).
 */
export class UserResponseDto {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  birthDate: string | null;
  phone: string | null;
  schoolGrade: string | null;
  instituteId: string | null;
  teacherDetails?: TeacherDetailsDto;
  createdAt: string;

  static fromDomain(user: User, withDetails = false): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.username = user.username.toString();
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.role = user.role;
    dto.birthDate = user.birthDate
      ? user.birthDate.toISOString().slice(0, 10)
      : null;
    dto.phone = user.phone;
    dto.schoolGrade = user.schoolGrade;
    dto.instituteId = user.instituteId;
    dto.createdAt = user.createdAt.toISOString();
    if (withDetails && user.role === UserRole.Teacher) {
      dto.teacherDetails = { ...user.teacherDetails };
    }
    return dto;
  }
}
