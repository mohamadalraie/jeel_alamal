import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import { UserRole } from '../../../shared/domain/user-role';
import { Username } from './value-objects/username.vo';

export { UserRole };

interface UserProps {
  username: Username;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  birthDate: Date | null;
  phone: string | null;
  /** Student-only field (e.g. "الصف الخامس"). */
  schoolGrade: string | null;
  /** Home institute for teachers/students. Null for global roles & managers. */
  instituteId: string | null;
  createdAt: Date;
}

/**
 * User aggregate root — the auth identity + shared profile for every role.
 * Pure business object: no Nest, no Drizzle, no HTTP. Invariants are enforced
 * at construction; persistence goes through the UserRepository port.
 */
export class User extends Entity<string> {
  private props: UserProps;

  private constructor(id: string, props: UserProps) {
    super(id);
    this.props = props;
  }

  /** Factory for a brand-new user (generates id + timestamp, checks invariants). */
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
      throw new BusinessRuleError(
        `A ${input.role} must belong to an institute`,
      );
    }
    if (!tenantBound && input.instituteId) {
      throw new BusinessRuleError(
        `A ${input.role} is not bound to a single institute`,
      );
    }
    if (input.schoolGrade && input.role !== UserRole.Student) {
      throw new BusinessRuleError('Only students have a school grade');
    }

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
      createdAt: new Date(),
    });
  }

  /** Rehydrate from persistence (no invariant re-check). */
  static reconstitute(id: string, props: UserProps): User {
    return new User(id, props);
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
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
