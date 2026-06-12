import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';
import { ClassResponseDto } from '../dto/class.dto';

/** List an institute's classes with memberships. Permission: institute staff. */
@Injectable()
export class ListClassesUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<ClassResponseDto[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const list = await this.classes.findAllByInstitute(instituteId);
    return Promise.all(
      list.map(async (klass) =>
        ClassResponseDto.fromDomain(
          klass,
          await this.classes.getMembership(klass.id),
        ),
      ),
    );
  }
}
