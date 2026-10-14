import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LessonsController } from './presentation/lessons.controller';
import {
  AddCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
} from './application/lesson-category.use-cases';
import {
  AddSubjectUseCase,
  ListSubjectsUseCase,
  UpdateSubjectUseCase,
  ArchiveSubjectUseCase,
  UnarchiveSubjectUseCase,
} from './application/lesson-subject.use-cases';
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
import { GetWeeklyPlanUseCase } from './application/get-weekly-plan.use-case';
import { GetMyWeeklyPlanUseCase } from './application/get-my-weekly-plan.use-case';
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
import { MaterializeScheduledLessonUseCase } from './application/materialize-scheduled-lesson.use-case';
import { SubmitLessonReportUseCase } from './application/submit-lesson-report.use-case';
import { GetLessonReportUseCase } from './application/get-lesson-report.use-case';
import { UpdateLessonReportUseCase } from './application/update-lesson-report.use-case';
import { RetryLessonReportWebhookUseCase } from './application/retry-lesson-report-webhook.use-case';
import { LESSON_REPOSITORY } from './domain/lesson.repository';
import { LESSON_SETTINGS_REPOSITORY } from './domain/lesson-settings.repository';
import { LESSON_REPORT_REPOSITORY } from './domain/lesson-report.repository';
import { WEBHOOK_DISPATCHER } from './domain/webhook-dispatcher.port';
import { DrizzleLessonRepository } from './infrastructure/persistence/drizzle-lesson.repository';
import { DrizzleLessonSettingsRepository } from './infrastructure/persistence/drizzle-lesson-settings.repository';
import { DrizzleLessonReportRepository } from './infrastructure/persistence/drizzle-lesson-report.repository';
import { HttpWebhookDispatcher } from './infrastructure/webhook/http-webhook.dispatcher';

/**
 * Class lessons program (الدروس) — spec 008, 009 & 012. Reuses USER_REPOSITORY,
 * CLASS_REPOSITORY, InstituteAccessPolicy, and MANAGER_ASSIGNMENTS from the
 * modules it imports.
 */
@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule, NotificationsModule],
  controllers: [LessonsController],
  providers: [
    AddCategoryUseCase,
    ListCategoriesUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    AddSubjectUseCase,
    ListSubjectsUseCase,
    UpdateSubjectUseCase,
    ArchiveSubjectUseCase,
    UnarchiveSubjectUseCase,
    CreateLessonUseCase,
    UpdateLessonUseCase,
    DeleteLessonUseCase,
    RemoveLessonClassUseCase,
    ReorderClassDayUseCase,
    GetClassProgramUseCase,
    GetInstituteProgramUseCase,
    GetWeeklyPlanUseCase,
    GetMyWeeklyPlanUseCase,
    GetMyLessonsUseCase,
    GetStudentClassLessonsUseCase,
    StartLessonUseCase,
    EndLessonUseCase,
    GetLessonTimerUseCase,
    GetLessonSettingsUseCase,
    UpdateLessonSettingsUseCase,
    MaterializeScheduledLessonUseCase,
    SubmitLessonReportUseCase,
    GetLessonReportUseCase,
    UpdateLessonReportUseCase,
    RetryLessonReportWebhookUseCase,
    { provide: LESSON_REPOSITORY, useClass: DrizzleLessonRepository },
    {
      provide: LESSON_SETTINGS_REPOSITORY,
      useClass: DrizzleLessonSettingsRepository,
    },
    {
      provide: LESSON_REPORT_REPOSITORY,
      useClass: DrizzleLessonReportRepository,
    },
    {
      provide: WEBHOOK_DISPATCHER,
      useClass: HttpWebhookDispatcher,
    },
  ],
  exports: [LESSON_REPOSITORY],
})
export class LessonsModule {}
