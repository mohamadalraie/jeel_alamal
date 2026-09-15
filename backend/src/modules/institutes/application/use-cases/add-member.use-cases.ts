import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { NotFoundError } from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { CreateUserAccountUseCase } from '../../../users/application/use-cases/create-user-account.use-case';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { CreateTeacherDto, CreateStudentDto } from '../dto/create-member.dto';
import { InstituteAccessPolicy } from '../institute-access.policy';

/**
 * Create or assign a teacher account inside an institute. Permission: assigned manager
 * only (spec 001 matrix).
 */
@Injectable()
export class AddTeacherUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    private readonly createUserAccount: CreateUserAccountUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateTeacherDto,
  ): Promise<UserResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);
    if (dto.existingUserId) {
      const teacher = await this.users.findById(dto.existingUserId);
      if (!teacher) throw new NotFoundError('Teacher account not found');
      teacher.assignToInstitute(instituteId);
      await this.users.save(teacher);
      return UserResponseDto.fromDomain(teacher);
    }
    const teacher = await this.createUserAccount.execute({
      firstName: dto.firstName!,
      lastName: dto.lastName!,
      birthDate: dto.birthDate!,
      phone: dto.phone!,
      username: dto.username!,
      password: dto.password!,
      role: UserRole.Teacher,
      instituteId,
    });
    return UserResponseDto.fromDomain(teacher);
  }
}

/**
 * Create or assign a student account inside an institute. Permission: assigned manager
 * OR a teacher of the same institute (spec 001: "teacher: create students").
 */
@Injectable()
export class AddStudentUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    private readonly createUserAccount: CreateUserAccountUseCase,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateStudentDto,
  ): Promise<UserResponseDto> {
    await this.policy.assertStaffOf(actor, instituteId);
    if (dto.existingUserId) {
      const student = await this.users.findById(dto.existingUserId);
      if (!student) throw new NotFoundError('Student account not found');
      student.assignToInstitute(instituteId);
      await this.users.save(student);
      return UserResponseDto.fromDomain(student);
    }
    const student = await this.createUserAccount.execute({
      firstName: dto.firstName!,
      lastName: dto.lastName!,
      birthDate: dto.birthDate!,
      phone: dto.phone!,
      username: dto.username!,
      password: dto.password!,
      schoolGrade: dto.schoolGrade,
      role: UserRole.Student,
      instituteId,
    });
    return UserResponseDto.fromDomain(student);
  }
}
