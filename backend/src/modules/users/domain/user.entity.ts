import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import {
  StudyDegree,
  TajweedLevel,
} from '../../../shared/domain/teacher-attributes';
import {
  assertBirthDateNotFuture,
  assertQuranPartsInRange,
  assertValidPhone,
} from '../../../shared/domain/profile-validation';
import { assertValidGrade } from '../../../shared/domain/student-grade';
import { Username } from './value-objects/username.vo';

export { UserRole };

/** Teacher extended profile (العلم الشرعي + academic), null for non-teachers. */
export interface TeacherDetails {
  studyDegree: StudyDegree | null;
  studyField: string | null;
  quranPartsMemorized: number | null;
  tajweedLevel: TajweedLevel | null;
}

export const emptyTeacherDetails = (): TeacherDetails => ({
  studyDegree: null,
  studyField: null,
  quranPartsMemorized: null,
  tajweedLevel: null,
});

interface UserProps {
  username: Username;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  birthDate: Date | null;
  phone: string | null;
  schoolGrade: string | null;
  instituteId: string | null;
  teacherDetails: TeacherDetails;
  createdAt: Date;
}

/**
 * User aggregate root — auth identity + shared profile + (for teachers) the
 * extended Islamic-knowledge details. Pure business object: no Nest, no Drizzle,
 * no HTTP. Invariants enforced at construction and on every mutation.
 */
export class User extends Entity<string> {
  private props: UserProps;

  private constructor(id: string, props: UserProps) {
    super(id);
    this.props = props;
  }

  static create(input: {
    username: Username;
    firstName: string;
    lastName: string;
    passwordHash: string;
    role: UserRole;
    birthDate?: Date | null;
    phone?: string | null;
    schoolGrade?: string | null;
    instituteId?: string | null;
  }): User {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (firstName.length < 1 || lastName.length < 1) {
      throw new BusinessRuleError('First and last name are required');
    }

    const tenantBound =
      input.role === UserRole.Teacher || input.role === UserRole.Student;
    if (tenantBound && !input.instituteId) {
      throw new BusinessRuleError(`A ${input.role} must belong to an institute`);
    }
    if (!tenantBound && input.instituteId) {
      throw new BusinessRuleError(`A ${input.role} is not bound to one institute`);
    }
    if (input.schoolGrade && input.role !== UserRole.Student) {
      throw new BusinessRuleError('Only students have a school grade');
    }

    assertValidPhone(input.phone);
    assertBirthDateNotFuture(input.birthDate ?? null);
    assertValidGrade(input.schoolGrade);

    return new User(randomUUID(), {
      username: input.username,
      firstName,
      lastName,
      passwordHash: input.passwordHash,
      role: input.role,
      birthDate: input.birthDate ?? null,
      phone: input.phone ?? null,
      schoolGrade: input.schoolGrade ?? null,
      instituteId: input.instituteId ?? null,
      teacherDetails: emptyTeacherDetails(),
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: UserProps): User {
    return new User(id, props);
  }

  /** Edit identity/basic profile fields (manager/super_admin, or staff on students). */
  editBasicInfo(input: {
    firstName: string;
    lastName: string;
    birthDate: Date | null;
    phone: string | null;
    schoolGrade?: string | null;
  }): void {
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (firstName.length < 1 || lastName.length < 1) {
      throw new BusinessRuleError('First and last name are required');
    }
    assertValidPhone(input.phone);
    assertBirthDateNotFuture(input.birthDate);
    assertValidGrade(input.schoolGrade);

    this.props.firstName = firstName;
    this.props.lastName = lastName;
    this.props.birthDate = input.birthDate;
    this.props.phone = input.phone;
    if (input.schoolGrade !== undefined && this.props.role === UserRole.Student) {
      this.props.schoolGrade = input.schoolGrade || null;
    }
  }

  /** Edit teacher extended details (manager/super_admin only). */
  editTeacherDetails(details: TeacherDetails): void {
    if (this.props.role !== UserRole.Teacher) {
      throw new BusinessRuleError('Only teachers have extended details');
    }
    assertQuranPartsInRange(details.quranPartsMemorized);
    this.props.teacherDetails = {
      studyDegree: details.studyDegree ?? null,
      studyField: details.studyField?.trim() || null,
      quranPartsMemorized: details.quranPartsMemorized ?? null,
      tajweedLevel: details.tajweedLevel ?? null,
    };
  }

  get username(): Username {
    return this.props.username;
  }
  get firstName(): string {
    return this.props.firstName;
  }
  get lastName(): string {
    return this.props.lastName;
  }
  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get birthDate(): Date | null {
    return this.props.birthDate;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get schoolGrade(): string | null {
    return this.props.schoolGrade;
  }
  get instituteId(): string | null {
    return this.props.instituteId;
  }
  get teacherDetails(): TeacherDetails {
    return this.props.teacherDetails;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
