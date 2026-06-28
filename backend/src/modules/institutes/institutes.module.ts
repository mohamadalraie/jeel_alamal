import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { InstitutesController } from './presentation/institutes.controller';
import { CreateInstituteUseCase } from './application/use-cases/create-institute.use-case';
import { ListInstitutesUseCase } from './application/use-cases/list-institutes.use-case';
import { UpdateInstituteUseCase } from './application/use-cases/update-institute.use-case';
import {
  AddTeacherUseCase,
  AddStudentUseCase,
} from './application/use-cases/add-member.use-cases';
import {
  AddManagerUseCase,
  ListManagersUseCase,
  RemoveManagerUseCase,
} from './application/use-cases/manage-managers.use-cases';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { InstituteAccessPolicy } from './application/institute-access.policy';
import { INSTITUTE_REPOSITORY } from './domain/institute.repository';
import { MANAGER_ASSIGNMENTS } from './domain/manager-assignment.repository';
import { DrizzleInstituteRepository } from './infrastructure/persistence/drizzle-institute.repository';
import { DrizzleManagerAssignmentRepository } from './infrastructure/persistence/drizzle-manager-assignment.repository';

@Module({
  imports: [UsersModule],
  controllers: [InstitutesController],
  providers: [
    CreateInstituteUseCase,
    ListInstitutesUseCase,
    UpdateInstituteUseCase,
    AddTeacherUseCase,
    AddStudentUseCase,
    ListMembersUseCase,
    AddManagerUseCase,
    ListManagersUseCase,
    RemoveManagerUseCase,
    InstituteAccessPolicy,
    { provide: INSTITUTE_REPOSITORY, useClass: DrizzleInstituteRepository },
    {
      provide: MANAGER_ASSIGNMENTS,
      useClass: DrizzleManagerAssignmentRepository,
    },
  ],
  // The access policy (and its assignment port) is reused by the classes module.
  exports: [InstituteAccessPolicy, MANAGER_ASSIGNMENTS],
})
export class InstitutesModule {}
