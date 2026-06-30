import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { LessonsController } from './presentation/lessons.controller';
import {
  AddCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
} from './application/lesson-category.use-cases';
import {
  CreateLessonUseCase,
  UpdateLessonUseCase,
  DeleteLessonUseCase,
  RemoveLessonClassUseCase,
  ReorderClassDayUseCase,
} from './application/lesson.use-cases';
import { GetClassProgramUseCase } from './application/class-program.use-case';
import { GetMyLessonsUseCase } from './application/teacher-lessons.use-case';
import { GetStudentClassLessonsUseCase } from './application/student-lessons.use-case';
import { LESSON_REPOSITORY } from './domain/lesson.repository';
import { DrizzleLessonRepository } from './infrastructure/persistence/drizzle-lesson.repository';

/**
 * Class lessons program (الدروس) — spec 008. Reuses USER_REPOSITORY,
 * CLASS_REPOSITORY, InstituteAccessPolicy, and MANAGER_ASSIGNMENTS from the
 * modules it imports.
 */
@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule],
  controllers: [LessonsController],
  providers: [
    AddCategoryUseCase,
    ListCategoriesUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    CreateLessonUseCase,
    UpdateLessonUseCase,
    DeleteLessonUseCase,
    RemoveLessonClassUseCase,
    ReorderClassDayUseCase,
    GetClassProgramUseCase,
    GetMyLessonsUseCase,
    GetStudentClassLessonsUseCase,
    { provide: LESSON_REPOSITORY, useClass: DrizzleLessonRepository },
  ],
})
export class LessonsModule {}
