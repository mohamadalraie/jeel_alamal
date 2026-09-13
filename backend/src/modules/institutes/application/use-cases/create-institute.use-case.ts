import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/domain.error';
import { Institute } from '../../domain/institute.entity';
import { INSTITUTE_REPOSITORY } from '../../domain/institute.repository';
import type { InstituteRepository } from '../../domain/institute.repository';
import { CreateUserAccountUseCase } from '../../../users/application/use-cases/create-user-account.use-case';
import { CreateInstituteDto } from '../dto/create-institute.dto';
import { InstituteResponseDto } from '../dto/institute-response.dto';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';

export interface CreateInstituteResult {
  institute: InstituteResponseDto;
  manager: UserResponseDto;
}

/**
 * Super-admin only: create an institute together with its manager account (or existing manager)
 * and the manager→institute assignment, atomically (one transaction via the
 * provisioning port). Spec 001 step 1.
 */
@Injectable()
export class CreateInstituteUseCase {
  constructor(
    @Inject(INSTITUTE_REPOSITORY)
    private readonly institutes: InstituteRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    private readonly createUserAccount: CreateUserAccountUseCase,
  ) {}

  async execute(
    actor: Actor,
    dto: CreateInstituteDto,
  ): Promise<CreateInstituteResult> {
    if (actor.role !== UserRole.SuperAdmin) {
      throw new ForbiddenError('Only the super admin can create institutes');
    }

    const institute = Institute.create({
      name: dto.name,
      place: dto.place,
      description: dto.description,
      logoUrl: dto.logoUrl,
    });

    if (dto.existingManagerId) {
      const manager = await this.users.findById(dto.existingManagerId);
      if (!manager) {
        throw new NotFoundError('Selected manager account not found');
      }
      await this.institutes.provisionWithExistingManager(
        institute,
        dto.existingManagerId,
      );
      return {
        institute: InstituteResponseDto.fromDomain(institute),
        manager: UserResponseDto.fromDomain(manager),
      };
    }

    if (!dto.manager) {
      throw new ForbiddenError(
        'Manager details or existing manager selection required',
      );
    }

    // Build (validate + hash) without persisting — persistence happens inside
    // the provisioning transaction so institute+manager succeed or fail together.
    const manager = await this.createUserAccount.build({
      ...dto.manager,
      role: UserRole.InstituteManager,
    });

    await this.institutes.provisionWithManager(institute, manager);

    return {
      institute: InstituteResponseDto.fromDomain(institute),
      manager: UserResponseDto.fromDomain(manager),
    };
  }
}
