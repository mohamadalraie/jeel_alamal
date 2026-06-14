import { User } from '../../domain/user.entity';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  StudyDegree,
  TajweedLevel,
} from '../../../../shared/domain/teacher-attributes';
import { Username } from '../../domain/value-objects/username.vo';
import type { UserRow } from './user.schema';

/**
 * Translates between the domain `User` and the Drizzle row shape. Note that
 * the pg `date` column round-trips as a 'YYYY-MM-DD' string.
 */
export class UserMapper {
  static toDomain(row: UserRow): User {
    return User.reconstitute(row.id, {
      username: Username.create(row.username),
      firstName: row.firstName,
      lastName: row.lastName,
      passwordHash: row.passwordHash,
      role: row.role as UserRole,
      birthDate: row.birthDate ? new Date(row.birthDate) : null,
      phone: row.phone,
      schoolGrade: row.schoolGrade,
      instituteId: row.instituteId,
      teacherDetails: {
        studyDegree: (row.studyDegree as StudyDegree | null) ?? null,
        studyField: row.studyField,
        quranPartsMemorized: row.quranParts,
        tajweedLevel: (row.tajweedLevel as TajweedLevel | null) ?? null,
      },
      createdAt: row.createdAt,
    });
  }

  static toRow(user: User): UserRow {
    const td = user.teacherDetails;
    return {
      id: user.id,
      username: user.username.toString(),
      passwordHash: user.passwordHash,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate
        ? user.birthDate.toISOString().slice(0, 10)
        : null,
      phone: user.phone,
      schoolGrade: user.schoolGrade,
      instituteId: user.instituteId,
      studyDegree: td.studyDegree,
      studyField: td.studyField,
      quranParts: td.quranPartsMemorized,
      tajweedLevel: td.tajweedLevel,
      createdAt: user.createdAt,
      // Soft-delete is applied via a dedicated UPDATE; saving an entity always
      // represents an active account.
      deletedAt: null,
    };
  }
}
