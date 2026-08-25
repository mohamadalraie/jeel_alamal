import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  BusinessRuleError,
  NotFoundError,
} from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { CLASS_REPOSITORY } from '../../../classes/domain/class.repository';
import type { ClassRepository } from '../../../classes/domain/class.repository';
import { ProfileAccessPolicy } from '../profile-access.policy';
import { UpdateBasicInfoDto } from '../dto/profile.dto';

export interface StudentProfileResult {
  student: UserResponseDto;
  currentClass: { id: string; name: string } | null;
}

/** Load a student's profile + current class. Staff or the student themselves. */
@Injectable()
export class GetStudentProfileUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    studentId: string,
  ): Promise<StudentProfileResult> {
    const isSelf =
      actor.role === UserRole.Student && actor.userId === studentId;
    if (!isSelf) {
      await this.policy.assertStaffOfInstitute(actor, instituteId);
    }
    const student = await loadStudent(this.users, instituteId, studentId);
    const current = await this.classes.findCurrentClassOfStudent(studentId);
    return {
      student: UserResponseDto.fromDomain(student),
      currentClass: current ? { id: current.id, name: current.name } : null,
    };
  }
}

/** Edit a student's details. Staff only (teacher/manager/super_admin). */
@Injectable()
export class UpdateStudentUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    studentId: string,
    dto: UpdateBasicInfoDto,
  ): Promise<void> {
    await this.policy.assertStaffOfInstitute(actor, instituteId);
    const student = await loadStudent(this.users, instituteId, studentId);
    student.editBasicInfo({
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: new Date(dto.birthDate),
      phone: dto.phone,
      schoolGrade: dto.schoolGrade ?? null,
    });
    await this.users.save(student);
  }
}

/**
 * Transfer the student to another class of the same institute, or remove them
 * (classId = null). Staff only. The target class must belong to the institute.
 */
@Injectable()
export class ChangeStudentClassUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    studentId: string,
    targetClassId: string | null,
  ): Promise<void> {
    await this.policy.assertStaffOfInstitute(actor, instituteId);
    await loadStudent(this.users, instituteId, studentId);

    if (targetClassId) {
      const klass = await this.classes.findById(targetClassId);
      if (!klass || klass.instituteId !== instituteId) {
        throw new BusinessRuleError('Target class is not in this institute');
      }
    }
    await this.classes.transferStudent(studentId, targetClassId);
  }
}

async function loadStudent(
  users: UserRepository,
  instituteId: string,
  studentId: string,
) {
  const student = await users.findById(studentId);
  if (
    !student ||
    student.role !== UserRole.Student ||
    student.instituteId !== instituteId
  ) {
    throw new NotFoundError('Student not found in this institute');
  }
  return student;
}
