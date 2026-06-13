import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { NotFoundError } from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { CLASS_REPOSITORY } from '../../../classes/domain/class.repository';
import type { ClassRepository } from '../../../classes/domain/class.repository';
import { CERTIFICATION_REPOSITORY } from '../../domain/teacher-certification.repository';
import type { TeacherCertificationRepository } from '../../domain/teacher-certification.repository';
import { ProfileAccessPolicy } from '../profile-access.policy';
import {
  CertificationDto,
  UpdateBasicInfoDto,
  UpdateTeacherDetailsDto,
} from '../dto/profile.dto';

export interface TeacherProfileResult {
  teacher: UserResponseDto; // teacherDetails present only for manager/super_admin
  classes: { id: string; name: string }[];
  certifications: CertificationDto[]; // empty for non-privileged viewers
}

/** Loads a teacher (basic always; extended + certifications gated by role). */
@Injectable()
export class GetTeacherProfileUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(CERTIFICATION_REPOSITORY)
    private readonly certs: TeacherCertificationRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    teacherId: string,
  ): Promise<TeacherProfileResult> {
    const teacher = await this.loadTeacher(instituteId, teacherId);
    await this.policy.assertCanViewTeacherBasic(actor, instituteId, teacherId);

    const canSeeDetails = this.policy.canSeeTeacherDetails(actor);
    const classes = await this.classes.findClassesByTeacher(teacherId);
    const certifications = canSeeDetails
      ? await this.certs.findByTeacher(teacherId)
      : [];

    return {
      teacher: UserResponseDto.fromDomain(teacher, canSeeDetails),
      classes: classes.map((c) => ({ id: c.id, name: c.name })),
      certifications: certifications.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  private async loadTeacher(instituteId: string, teacherId: string) {
    const teacher = await this.users.findById(teacherId);
    if (
      !teacher ||
      teacher.role !== UserRole.Teacher ||
      teacher.instituteId !== instituteId
    ) {
      throw new NotFoundError('Teacher not found in this institute');
    }
    return teacher;
  }
}

/** Edit a teacher's basic info (manager/super_admin). */
@Injectable()
export class UpdateTeacherBasicUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    teacherId: string,
    dto: UpdateBasicInfoDto,
  ): Promise<void> {
    await this.policy.assertManagesInstitute(actor, instituteId);
    const teacher = await this.users.findById(teacherId);
    if (
      !teacher ||
      teacher.role !== UserRole.Teacher ||
      teacher.instituteId !== instituteId
    ) {
      throw new NotFoundError('Teacher not found in this institute');
    }
    teacher.editBasicInfo({
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: new Date(dto.birthDate),
      phone: dto.phone,
    });
    await this.users.save(teacher);
  }
}

/** Edit a teacher's extended (Islamic-knowledge) details (manager/super_admin). */
@Injectable()
export class UpdateTeacherDetailsUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    teacherId: string,
    dto: UpdateTeacherDetailsDto,
  ): Promise<void> {
    await this.policy.assertManagesInstitute(actor, instituteId);
    const teacher = await this.users.findById(teacherId);
    if (
      !teacher ||
      teacher.role !== UserRole.Teacher ||
      teacher.instituteId !== instituteId
    ) {
      throw new NotFoundError('Teacher not found in this institute');
    }
    teacher.editTeacherDetails({
      studyDegree: dto.studyDegree ?? null,
      studyField: dto.studyField ?? null,
      quranPartsMemorized: dto.quranPartsMemorized ?? null,
      tajweedLevel: dto.tajweedLevel ?? null,
    });
    await this.users.save(teacher);
  }
}
