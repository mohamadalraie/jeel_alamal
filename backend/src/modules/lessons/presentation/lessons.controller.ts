import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import {
  WEBHOOK_DISPATCHER,
  type WebhookDispatcherPort,
  type LessonReportWebhookPayload,
} from '../domain/webhook-dispatcher.port';
import {
  AddCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
} from '../application/lesson-category.use-cases';
import {
  AddSubjectUseCase,
  ListSubjectsUseCase,
  UpdateSubjectUseCase,
  ArchiveSubjectUseCase,
  UnarchiveSubjectUseCase,
} from '../application/lesson-subject.use-cases';
import {
  CreateLessonUseCase,
  UpdateLessonUseCase,
  DeleteLessonUseCase,
  RemoveLessonClassUseCase,
  ReorderClassDayUseCase,
} from '../application/lesson.use-cases';
import {
  GetClassProgramUseCase,
  GetInstituteProgramUseCase,
} from '../application/class-program.use-case';
import { GetWeeklyPlanUseCase } from '../application/get-weekly-plan.use-case';
import { GetMyWeeklyPlanUseCase } from '../application/get-my-weekly-plan.use-case';
import { GetMyLessonsUseCase } from '../application/teacher-lessons.use-case';
import { GetStudentClassLessonsUseCase } from '../application/student-lessons.use-case';
import {
  StartLessonUseCase,
  EndLessonUseCase,
  GetLessonTimerUseCase,
} from '../application/lesson-lifecycle.use-cases';
import {
  GetLessonSettingsUseCase,
  UpdateLessonSettingsUseCase,
} from '../application/lesson-settings.use-cases';
import { MaterializeScheduledLessonUseCase } from '../application/materialize-scheduled-lesson.use-case';
import { SubmitLessonReportUseCase } from '../application/submit-lesson-report.use-case';
import { GetLessonReportUseCase } from '../application/get-lesson-report.use-case';
import { UpdateLessonReportUseCase } from '../application/update-lesson-report.use-case';
import { RetryLessonReportWebhookUseCase } from '../application/retry-lesson-report-webhook.use-case';
import { MaterializeScheduledLessonDto } from '../application/dto/materialize-lesson.dto';
import {
  SubmitLessonReportDto,
  UpdateLessonReportDto,
} from '../application/dto/lesson-report.dto';
import {
  CreateCategoryDto,
  CreateLessonDto,
  ReorderDayDto,
  UpdateCategoryDto,
  UpdateLessonDto,
  UpdateLessonSettingsDto,
} from '../application/dto/lesson.dto';

@Controller()
export class LessonsController {
  constructor(
    private readonly addCategory: AddCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
    private readonly addSubjectUC: AddSubjectUseCase,
    private readonly listSubjectsUC: ListSubjectsUseCase,
    private readonly updateSubjectUC: UpdateSubjectUseCase,
    private readonly archiveSubjectUC: ArchiveSubjectUseCase,
    private readonly unarchiveSubjectUC: UnarchiveSubjectUseCase,
    private readonly createLesson: CreateLessonUseCase,
    private readonly updateLesson: UpdateLessonUseCase,
    private readonly deleteLesson: DeleteLessonUseCase,
    private readonly removeLessonClass: RemoveLessonClassUseCase,
    private readonly reorderDay: ReorderClassDayUseCase,
    private readonly getClassProgram: GetClassProgramUseCase,
    private readonly getInstituteProgram: GetInstituteProgramUseCase,
    private readonly getWeeklyPlan: GetWeeklyPlanUseCase,
    private readonly getMyWeeklyPlan: GetMyWeeklyPlanUseCase,
    private readonly getMyLessons: GetMyLessonsUseCase,
    private readonly getStudentLessons: GetStudentClassLessonsUseCase,
    private readonly startLesson: StartLessonUseCase,
    private readonly endLesson: EndLessonUseCase,
    private readonly getLessonTimer: GetLessonTimerUseCase,
    private readonly getLessonSettings: GetLessonSettingsUseCase,
    private readonly updateLessonSettings: UpdateLessonSettingsUseCase,
    private readonly materializeLesson: MaterializeScheduledLessonUseCase,
    private readonly submitReport: SubmitLessonReportUseCase,
    private readonly getReport: GetLessonReportUseCase,
    private readonly updateReport: UpdateLessonReportUseCase,
    private readonly retryWebhook: RetryLessonReportWebhookUseCase,
    @Inject(WEBHOOK_DISPATCHER)
    private readonly webhookDispatcher: WebhookDispatcherPort,
  ) { }

  // ── Categories ──
  @Post('institutes/:instituteId/lesson-categories')
  @HttpCode(HttpStatus.CREATED)
  createCategory(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.addCategory.execute(actor, instituteId, dto);
  }

  @Get('institutes/:instituteId/lesson-categories')
  categories(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listCategories.execute(actor, instituteId);
  }

  @Patch('lesson-categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async editCategory(
    @CurrentUser() actor: Actor,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    await this.updateCategory.execute(actor, categoryId, dto);
  }

  @Delete('lesson-categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCategory(
    @CurrentUser() actor: Actor,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    await this.deleteCategory.execute(actor, categoryId);
  }

  // ── Lessons ──
  @Post('institutes/:instituteId/lessons')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.createLesson.execute(actor, instituteId, dto);
  }

  @Patch('lessons/:lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async edit(
    @CurrentUser() actor: Actor,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    await this.updateLesson.execute(actor, lessonId, dto);
  }

  @Delete('lessons/:lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actor: Actor,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    await this.deleteLesson.execute(actor, lessonId);
  }

  @Delete('lesson-classes/:lessonClassId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromClass(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
  ) {
    await this.removeLessonClass.execute(actor, lessonClassId);
  }

  @Put('classes/:classId/lessons/order')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: ReorderDayDto,
  ) {
    await this.reorderDay.execute(
      actor,
      classId,
      dto.date,
      dto.orderedLessonClassIds,
    );
  }

  // ── Reads ──
  @Get('institutes/:instituteId/lessons')
  instituteProgram(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.getInstituteProgram.execute(actor, instituteId, from, to);
  }

  @Get('classes/:classId/lessons')
  classProgram(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.getClassProgram.execute(actor, classId, from, to);
  }

  @Get('classes/:classId/weekly-plan')
  weeklyPlan(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.getWeeklyPlan.execute(actor, classId, weekStart);
  }

  @Get('institutes/:instituteId/weekly-plan')
  instituteWeeklyPlan(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.getWeeklyPlan.executeForInstitute(actor, instituteId, weekStart);
  }

  @Get('weekly-plan/mine')
  myWeeklyPlan(
    @CurrentUser() actor: Actor,
    @Query('weekStart') weekStart: string,
  ) {
    return this.getMyWeeklyPlan.execute(actor, weekStart);
  }

  @Get('classes/:classId/lessons/student')
  studentProgram(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.getStudentLessons.execute(actor, classId);
  }

  @Get('lessons/mine')
  mine(
    @CurrentUser() actor: Actor,
    @Query('instituteId') instituteId?: string,
  ) {
    return this.getMyLessons.execute(actor, instituteId);
  }

  // ── Lesson lifecycle (spec 009) ──
  @Post('lesson-classes/:lessonClassId/start')
  @HttpCode(HttpStatus.NO_CONTENT)
  async start(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
  ) {
    await this.startLesson.execute(actor, lessonClassId);
  }

  @Post('lesson-classes/:lessonClassId/end')
  end(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
  ) {
    return this.endLesson.execute(actor, lessonClassId);
  }

  @Get('lesson-classes/:lessonClassId/timer')
  timer(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
  ) {
    return this.getLessonTimer.execute(actor, lessonClassId);
  }

  // ── Subjects ──
  @Post('institutes/:instituteId/lesson-subjects')
  @HttpCode(HttpStatus.CREATED)
  createSubject(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: { name: string; color?: string },
  ) {
    return this.addSubjectUC.execute(actor, instituteId, dto);
  }

  @Get('institutes/:instituteId/lesson-subjects')
  listSubjects(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.listSubjectsUC.execute(actor, instituteId, includeArchived === 'true');
  }

  @Patch('lesson-subjects/:subjectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async editSubject(
    @CurrentUser() actor: Actor,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() dto: { name: string; color?: string | null },
  ) {
    await this.updateSubjectUC.execute(actor, subjectId, dto);
  }

  @Post('lesson-subjects/:subjectId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archiveSubject(
    @CurrentUser() actor: Actor,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    await this.archiveSubjectUC.execute(actor, subjectId);
  }

  @Post('lesson-subjects/:subjectId/unarchive')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unarchiveSubject(
    @CurrentUser() actor: Actor,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    await this.unarchiveSubjectUC.execute(actor, subjectId);
  }

  // ── Lesson settings (spec 009) ──
  @Get('institutes/:instituteId/lesson-settings')
  lessonSettings(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.getLessonSettings.execute(actor, instituteId);
  }

  @Put('institutes/:instituteId/lesson-settings')
  saveLessonSettings(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: UpdateLessonSettingsDto,
  ) {
    return this.updateLessonSettings.execute(actor, instituteId, dto);
  }

  // ── Spec 012: Materialization & Lesson Reports ──
  @Post('lesson-classes/materialize')
  @HttpCode(HttpStatus.CREATED)
  materializeScheduledSlot(
    @CurrentUser() actor: Actor,
    @Body() dto: MaterializeScheduledLessonDto,
  ) {
    return this.materializeLesson.execute(actor, dto);
  }

  @Post('lesson-classes/:lessonClassId/report')
  @HttpCode(HttpStatus.CREATED)
  submitLessonReport(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
    @Body() dto: SubmitLessonReportDto,
  ) {
    return this.submitReport.execute(actor, lessonClassId, dto);
  }

  @Get('lesson-classes/:lessonClassId/report')
  getLessonReport(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
  ) {
    return this.getReport.execute(actor, lessonClassId);
  }

  @Patch('lesson-classes/:lessonClassId/report')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateLessonReport(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
    @Body() dto: UpdateLessonReportDto,
  ) {
    await this.updateReport.execute(actor, lessonClassId, dto);
  }

  @Post('lesson-classes/:lessonClassId/report/retry-webhook')
  retryReportWebhook(
    @CurrentUser() actor: Actor,
    @Param('lessonClassId', ParseUUIDPipe) lessonClassId: string,
  ) {
    return this.retryWebhook.execute(actor, lessonClassId);
  }

  @Post('institutes/:instituteId/lesson-settings/test-webhook')
  async testWebhook(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() body: { url: string; secret?: string },
  ) {
    if (actor.role !== 'super_admin' && actor.role !== 'institute_manager') {
      throw new ForbiddenException();
    }
    const samplePayload: LessonReportWebhookPayload = {
      event: 'lesson.report.completed',
      instituteId,
      classId: '00000000-0000-0000-0000-000000000000',
      className: 'حلقة تجريبية',
      lessonClassId: '00000000-0000-0000-0000-000000000000',
      lessonId: '00000000-0000-0000-0000-000000000000',
      lessonTitle: 'درس تجريبي لاختبار الربط مع n8n والواتساب',
      subjectName: 'تفسير القرآن',
      date: new Date().toISOString().split('T')[0],
      actualStartTime: new Date(),
      actualEndTime: new Date(),
      actualDurationMinutes: 45,
      expectedDurationMinutes: 45,
      teacher: {
        id: actor.userId,
        name: 'أستاذ تجريبي',
      },
      report: {
        mainIdeas: 'تم الاتصال بسيرفر n8n بنجاح عبر نظام جيل العمل!',
        parentMessageFormatted:
          '📌 *تقرير تجريبي لاختبار الربط مع واتساب*\n• تم الاتصال بنجاح بسيرفر n8n ونظام إدارة الحلقات.',
      },
    };
    return this.webhookDispatcher.dispatchReport(
      samplePayload,
      body.url,
      body.secret,
    );
  }
}
