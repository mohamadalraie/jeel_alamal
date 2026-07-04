import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  AddCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
} from '../application/lesson-category.use-cases';
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
import { GetMyLessonsUseCase } from '../application/teacher-lessons.use-case';
import { GetStudentClassLessonsUseCase } from '../application/student-lessons.use-case';
import {
  CreateCategoryDto,
  CreateLessonDto,
  ReorderDayDto,
  UpdateCategoryDto,
  UpdateLessonDto,
} from '../application/dto/lesson.dto';

@Controller()
export class LessonsController {
  constructor(
    private readonly addCategory: AddCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly deleteCategory: DeleteCategoryUseCase,
    private readonly createLesson: CreateLessonUseCase,
    private readonly updateLesson: UpdateLessonUseCase,
    private readonly deleteLesson: DeleteLessonUseCase,
    private readonly removeLessonClass: RemoveLessonClassUseCase,
    private readonly reorderDay: ReorderClassDayUseCase,
    private readonly getClassProgram: GetClassProgramUseCase,
    private readonly getInstituteProgram: GetInstituteProgramUseCase,
    private readonly getMyLessons: GetMyLessonsUseCase,
    private readonly getStudentLessons: GetStudentClassLessonsUseCase,
  ) {}

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
    await this.reorderDay.execute(actor, classId, dto.date, dto.orderedLessonClassIds);
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

  @Get('classes/:classId/lessons/student')
  studentProgram(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.getStudentLessons.execute(actor, classId);
  }

  @Get('lessons/mine')
  mine(@CurrentUser() actor: Actor) {
    return this.getMyLessons.execute(actor);
  }
}
