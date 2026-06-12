import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/user.repository';
import type { UserRepository } from '../../domain/user.repository';
import { User } from '../../domain/user.entity';
import { UserRole } from '../../../../shared/domain/user-role';
import { Username } from '../../domain/value-objects/username.vo';
import { ConflictError } from '../../../../shared/domain/domain.error';
import { PASSWORD_HASHER } from '../ports/password-hasher.port';
import type { PasswordHasher } from '../ports/password-hasher.port';

export interface CreateUserAccountInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  birthDate?: string | null;
  phone?: string | null;
  schoolGrade?: string | null;
  instituteId?: string | null;
}

/**
 * Creates and persists a user account of any role. This is an INTERNAL
 * application service — it performs no authorisation itself. Callers
 * (create-institute, add-teacher, add-student) authorise the actor first,
 * then delegate account creation here so username uniqueness and hashing
 * live in exactly one place.
 */
@Injectable()
export class CreateUserAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  /** Builds the domain User without persisting (for transactional flows). */
  async build(input: CreateUserAccountInput): Promise<User> {
    const username = Username.create(input.username);
    const existing = await this.users.findByUsername(username);
    if (existing) {
      throw new ConflictError(
        `Username "${username.toString()}" is already taken`,
      );
    }
    const passwordHash = await this.hasher.hash(input.password);
    return User.create({
      username,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      role: input.role,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      phone: input.phone ?? null,
      schoolGrade: input.schoolGrade ?? null,
      instituteId: input.instituteId ?? null,
    });
  }

  /** Builds AND persists. */
  async execute(input: CreateUserAccountInput): Promise<User> {
    const user = await this.build(input);
    await this.users.save(user);
    return user;
  }
}
