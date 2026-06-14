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
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case';
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case';
import { ListUnassignedStudentsUseCase } from '../application/use-cases/list-unassigned-students.use-case';
import {
  AddClassTeacherUseCase,
  SetClassSupervisorUseCase,
  EnrollStudentUseCase,
} from '../application/use-cases/manage-class-members.use-cases';
import {
  RemoveClassTeacherUseCase,
  RemoveClassStudentUseCase,
} from '../application/use-cases/remove-class-members.use-cases';
import {
  GetClassProfileUseCase,
  UpdateClassUseCase,
  DeleteClassUseCase,
  SetClassScheduleUseCase,
} from '../application/use-cases/class-profile.use-cases';
import { CreateClassDto, MemberIdDto } from '../application/dto/class.dto';
import { SetScheduleDto, UpdateClassDto } from '../application/dto/class-profile.dto';

@Controller()
export class ClassesController {
  constructor(
    private readonly createClass: CreateClassUseCase,
    private readonly listClasses: ListClassesUseCase,
    private readonly addClassTeacher: AddClassTeacherUseCase,
    private readonly setClassSupervisor: SetClassSupervisorUseCase,
    private readonly enrollStudent: EnrollStudentUseCase,
    private readonly removeClassTeacher: RemoveClassTeacherUseCase,
    private readonly removeClassStudent: RemoveClassStudentUseCase,
    private readonly getClassProfile: GetClassProfileUseCase,
    private readonly updateClass: UpdateClassUseCase,
    private readonly deleteClass: DeleteClassUseCase,
    private readonly setSchedule: SetClassScheduleUseCase,
    private readonly listUnassignedStudents: ListUnassignedStudentsUseCase,
  ) {}

  @Get('institutes/:instituteId/unassigned-students')
  unassignedStudents(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listUnassignedStudents.execute(actor, instituteId);
  }

  @Post('institutes/:instituteId/classes')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateClassDto,
  ) {
    return this.createClass.execute(actor, instituteId, dto);
  }

  @Get('institutes/:instituteId/classes')
  list(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listClasses.execute(actor, instituteId);
  }

  // ── Single class profile + CRUD (spec 003) ──
  @Get('classes/:classId')
  profile(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.getClassProfile.execute(actor, classId);
  }

  @Patch('classes/:classId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: UpdateClassDto,
  ) {
    await this.updateClass.execute(actor, classId, dto);
  }

  @Delete('classes/:classId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    await this.deleteClass.execute(actor, classId);
  }

  @Put('classes/:classId/schedule')
  @HttpCode(HttpStatus.NO_CONTENT)
  async schedule(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: SetScheduleDto,
  ) {
    await this.setSchedule.execute(actor, classId, dto.slots);
  }

  // ── Teachers ──
  @Post('classes/:classId/teachers')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addTeacher(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: MemberIdDto,
  ) {
    await this.addClassTeacher.execute(actor, classId, dto.userId);
  }

  @Delete('classes/:classId/teachers/:teacherId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTeacher(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
  ) {
    await this.removeClassTeacher.execute(actor, classId, teacherId);
  }

  @Put('classes/:classId/supervisor')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setSupervisor(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: MemberIdDto,
  ) {
    await this.setClassSupervisor.execute(actor, classId, dto.userId);
  }

  // ── Students ──
  @Post('classes/:classId/students')
  @HttpCode(HttpStatus.NO_CONTENT)
  async enroll(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: MemberIdDto,
  ) {
    await this.enrollStudent.execute(actor, classId, dto.userId);
  }

  @Delete('classes/:classId/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStudent(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    await this.removeClassStudent.execute(actor, classId, studentId);
  }
}
