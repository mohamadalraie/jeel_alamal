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
import {
  GetClassProgramUseCase,
  GetInstituteProgramUseCase,
} from './application/class-program.use-case';
import { GetMyLessonsUseCase } from './application/teacher-lessons.use-case';
import { GetStudentClassLessonsUseCase } from './application/student-lessons.use-case';
import {
  StartLessonUseCase,
  EndLessonUseCase,
  GetLessonTimerUseCase,
} from './application/lesson-lifecycle.use-cases';
import {
  GetLessonSettingsUseCase,
  UpdateLessonSettingsUseCase,
} from './application/lesson-settings.use-cases';
import { LESSON_REPOSITORY } from './domain/lesson.repository';
import { LESSON_SETTINGS_REPOSITORY } from './domain/lesson-settings.repository';
import { DrizzleLessonRepository } from './infrastructure/persistence/drizzle-lesson.repository';
import { DrizzleLessonSettingsRepository } from './infrastructure/persistence/drizzle-lesson-settings.repository';

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
    GetInstituteProgramUseCase,
    GetMyLessonsUseCase,
    GetStudentClassLessonsUseCase,
    StartLessonUseCase,
    EndLessonUseCase,
    GetLessonTimerUseCase,
    GetLessonSettingsUseCase,
    UpdateLessonSettingsUseCase,
    { provide: LESSON_REPOSITORY, useClass: DrizzleLessonRepository },
    { provide: LESSON_SETTINGS_REPOSITORY, useClass: DrizzleLessonSettingsRepository },
  ],
})
export class LessonsModule {}
