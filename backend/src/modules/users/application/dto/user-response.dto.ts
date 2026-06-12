import { User } from '../../domain/user.entity';
import { UserRole } from '../../../../shared/domain/user-role';

/**
 * Transport-safe shape of a user — the passwordHash never crosses this
 * boundary. Shared by every module that returns user data.
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
  createdAt: string;

  static fromDomain(user: User): UserResponseDto {
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
    return dto;
  }
}
