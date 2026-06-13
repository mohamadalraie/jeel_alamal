import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { TeacherCertification } from '../../domain/teacher-certification.entity';
import { CERTIFICATION_REPOSITORY } from '../../domain/teacher-certification.repository';
import type { TeacherCertificationRepository } from '../../domain/teacher-certification.repository';
import { ProfileAccessPolicy } from '../profile-access.policy';
import { AddCertificationDto, CertificationDto } from '../dto/profile.dto';

/** Add a certification to a teacher (manager/super_admin). */
@Injectable()
export class AddCertificationUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CERTIFICATION_REPOSITORY)
    private readonly certs: TeacherCertificationRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    teacherId: string,
    dto: AddCertificationDto,
  ): Promise<CertificationDto> {
    await this.policy.assertManagesInstitute(actor, instituteId);
    const teacher = await this.users.findById(teacherId);
    if (
      !teacher ||
      teacher.role !== UserRole.Teacher ||
      teacher.instituteId !== instituteId
    ) {
      throw new NotFoundError('Teacher not found in this institute');
    }
    const cert = TeacherCertification.create({ teacherId, title: dto.title });
    await this.certs.save(cert);
    return {
      id: cert.id,
      title: cert.title,
      createdAt: cert.createdAt.toISOString(),
    };
  }
}

/** Remove a certification (manager/super_admin). */
@Injectable()
export class RemoveCertificationUseCase {
  constructor(
    private readonly policy: ProfileAccessPolicy,
    @Inject(CERTIFICATION_REPOSITORY)
    private readonly certs: TeacherCertificationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    certificationId: string,
  ): Promise<void> {
    await this.policy.assertManagesInstitute(actor, instituteId);
    const cert = await this.certs.findById(certificationId);
    if (!cert) throw new NotFoundError('Certification not found');
    // Tenant guard: the certification's teacher must belong to this institute.
    const teacher = await this.users.findById(cert.teacherId);
    if (!teacher || teacher.instituteId !== instituteId) {
      throw new ForbiddenError('Certification does not belong to this institute');
    }
    await this.certs.delete(certificationId);
  }
}
