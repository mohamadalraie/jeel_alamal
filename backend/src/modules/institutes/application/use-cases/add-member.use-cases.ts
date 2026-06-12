import { Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { CreateUserAccountUseCase } from '../../../users/application/use-cases/create-user-account.use-case';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { CreateTeacherDto, CreateStudentDto } from '../dto/create-member.dto';
import { InstituteAccessPolicy } from '../institute-access.policy';

/**
 * Create a teacher account inside an institute. Permission: assigned manager
 * only (spec 001 matrix).
 */
@Injectable()
export class AddTeacherUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    private readonly createUserAccount: CreateUserAccountUseCase,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateTeacherDto,
  ): Promise<UserResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);
    const teacher = await this.createUserAccount.execute({
      ...dto,
      role: UserRole.Teacher,
      instituteId,
    });
    return UserResponseDto.fromDomain(teacher);
  }
}

/**
 * Create a student account inside an institute. Permission: assigned manager
 * OR a teacher of the same institute (spec 001: "teacher: create students").
 */
@Injectable()
export class AddStudentUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    private readonly createUserAccount: CreateUserAccountUseCase,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateStudentDto,
  ): Promise<UserResponseDto> {
    await this.policy.assertStaffOf(actor, instituteId);
    const student = await this.createUserAccount.execute({
      ...dto,
      role: UserRole.Student,
      instituteId,
    });
    return UserResponseDto.fromDomain(student);
  }
}
