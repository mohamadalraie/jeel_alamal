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
import {
  RemoveClassTeacherUseCase,
  RemoveClassStudentUseCase,
} from './application/use-cases/remove-class-members.use-cases';
import {
  GetClassProfileUseCase,
  UpdateClassUseCase,
  DeleteClassUseCase,
  SetClassScheduleUseCase,
} from './application/use-cases/class-profile.use-cases';
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
    RemoveClassTeacherUseCase,
    RemoveClassStudentUseCase,
    GetClassProfileUseCase,
    UpdateClassUseCase,
    DeleteClassUseCase,
    SetClassScheduleUseCase,
    { provide: CLASS_REPOSITORY, useClass: DrizzleClassRepository },
  ],
  // Exported so the profiles module can read teacher classes / transfer students.
  exports: [CLASS_REPOSITORY],
})
export class ClassesModule {}
