import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case';
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case';
import {
  AddClassTeacherUseCase,
  SetClassSupervisorUseCase,
  EnrollStudentUseCase,
} from '../application/use-cases/manage-class-members.use-cases';
import { CreateClassDto, MemberIdDto } from '../application/dto/class.dto';

@Controller()
export class ClassesController {
  constructor(
    private readonly createClass: CreateClassUseCase,
    private readonly listClasses: ListClassesUseCase,
    private readonly addClassTeacher: AddClassTeacherUseCase,
    private readonly setClassSupervisor: SetClassSupervisorUseCase,
    private readonly enrollStudent: EnrollStudentUseCase,
  ) {}

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

  @Post('classes/:classId/teachers')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addTeacher(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: MemberIdDto,
  ) {
    await this.addClassTeacher.execute(actor, classId, dto.userId);
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

  @Post('classes/:classId/students')
  @HttpCode(HttpStatus.NO_CONTENT)
  async enroll(
    @CurrentUser() actor: Actor,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: MemberIdDto,
  ) {
    await this.enrollStudent.execute(actor, classId, dto.userId);
  }
}
