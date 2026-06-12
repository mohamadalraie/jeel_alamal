import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { Class } from '../../domain/class.entity';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';
import { CreateClassDto, ClassResponseDto } from '../dto/class.dto';

/** Create a class (حلقة) in an institute. Permission: assigned manager. */
@Injectable()
export class CreateClassUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateClassDto,
  ): Promise<ClassResponseDto> {
    await this.policy.assertManagerOf(actor, instituteId);
    const klass = Class.create({
      instituteId,
      name: dto.name,
      description: dto.description,
    });
    await this.classes.save(klass);
    return ClassResponseDto.fromDomain(klass, {
      teacherIds: [],
      supervisorId: null,
      studentIds: [],
    });
  }
}
