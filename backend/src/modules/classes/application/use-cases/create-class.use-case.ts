import {
  ForbiddenException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { Class } from '../../domain/class.entity';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { INSTITUTE_REPOSITORY } from '../../../institutes/domain/institute.repository';
import type { InstituteRepository } from '../../../institutes/domain/institute.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';
import { CreateClassDto, ClassResponseDto } from '../dto/class.dto';

/** Create a class (حلقة) in an institute. Permission: assigned manager. */
@Injectable()
export class CreateClassUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(INSTITUTE_REPOSITORY) private readonly institutes: InstituteRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateClassDto,
  ): Promise<ClassResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);

    if (dto.isIntensive) {
      const institute = await this.institutes.findById(instituteId);
      if (!institute?.intensiveTrackEnabled) {
        throw new ForbiddenException(
          'Intensive track is disabled for this institute',
        );
      }
    }

    const klass = Class.create({
      instituteId,
      name: dto.name,
      description: dto.description,
      isIntensive: dto.isIntensive ?? false,
    });
    await this.classes.save(klass);
    return ClassResponseDto.fromDomain(klass, {
      teacherIds: [],
      supervisorId: null,
      studentIds: [],
      intensiveStudentIds: [],
    });
  }
}
