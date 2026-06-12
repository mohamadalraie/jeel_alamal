import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { ClassesController } from './presentation/classes.controller';
import { CreateClassUseCase } from './application/use-cases/create-class.use-case';
import { ListClassesUseCase } from './application/use-cases/list-classes.use-case';
import {
  AddClassTeacherUseCase,
  SetClassSupervisorUseCase,
  EnrollStudentUseCase,
} from './application/use-cases/manage-class-members.use-cases';
import { CLASS_REPOSITORY } from './domain/class.repository';
import { DrizzleClassRepository } from './infrastructure/persistence/drizzle-class.repository';

@Module({
  imports: [UsersModule, InstitutesModule],
  controllers: [ClassesController],
  providers: [
    CreateClassUseCase,
    ListClassesUseCase,
    AddClassTeacherUseCase,
    SetClassSupervisorUseCase,
    EnrollStudentUseCase,
    { provide: CLASS_REPOSITORY, useClass: DrizzleClassRepository },
  ],
})
export class ClassesModule {}
