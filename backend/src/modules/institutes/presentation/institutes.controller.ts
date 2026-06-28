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
} from '@nestjs/common';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { CreateInstituteUseCase } from '../application/use-cases/create-institute.use-case';
import { ListInstitutesUseCase } from '../application/use-cases/list-institutes.use-case';
import { UpdateInstituteUseCase } from '../application/use-cases/update-institute.use-case';
import { UpdateInstituteDto } from '../application/dto/update-institute.dto';
import {
  AddTeacherUseCase,
  AddStudentUseCase,
} from '../application/use-cases/add-member.use-cases';
import {
  AddManagerUseCase,
  ListManagersUseCase,
  RemoveManagerUseCase,
} from '../application/use-cases/manage-managers.use-cases';
import { ListMembersUseCase } from '../application/use-cases/list-members.use-case';
import { CreateInstituteDto } from '../application/dto/create-institute.dto';
import { CreateTeacherDto, CreateStudentDto } from '../application/dto/create-member.dto';

/**
 * Thin HTTP delivery: extract the verified actor, delegate to use-cases
 * (which authorise and tenant-scope), return DTOs. No business logic here.
 */
@Controller('institutes')
export class InstitutesController {
  constructor(
    private readonly createInstitute: CreateInstituteUseCase,
    private readonly listInstitutes: ListInstitutesUseCase,
    private readonly updateInstitute: UpdateInstituteUseCase,
    private readonly addTeacher: AddTeacherUseCase,
    private readonly addStudent: AddStudentUseCase,
    private readonly listMembers: ListMembersUseCase,
    private readonly addManager: AddManagerUseCase,
    private readonly listManagers: ListManagersUseCase,
    private readonly removeManager: RemoveManagerUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() actor: Actor, @Body() dto: CreateInstituteDto) {
    return this.createInstitute.execute(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.listInstitutes.execute(actor);
  }

  @Patch(':instituteId')
  update(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: UpdateInstituteDto,
  ) {
    return this.updateInstitute.execute(actor, instituteId, dto);
  }

  @Post(':instituteId/teachers')
  @HttpCode(HttpStatus.CREATED)
  createTeacher(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateTeacherDto,
  ) {
    return this.addTeacher.execute(actor, instituteId, dto);
  }

  @Get(':instituteId/teachers')
  listTeachers(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listMembers.execute(actor, instituteId, UserRole.Teacher);
  }

  @Post(':instituteId/students')
  @HttpCode(HttpStatus.CREATED)
  createStudent(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateStudentDto,
  ) {
    return this.addStudent.execute(actor, instituteId, dto);
  }

  @Get(':instituteId/students')
  listStudents(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listMembers.execute(actor, instituteId, UserRole.Student);
  }

  // ── Managers (an institute may have several) ──
  @Post(':instituteId/managers')
  @HttpCode(HttpStatus.CREATED)
  createManager(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Body() dto: CreateTeacherDto,
  ) {
    return this.addManager.execute(actor, instituteId, dto);
  }

  @Get(':instituteId/managers')
  listInstituteManagers(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
  ) {
    return this.listManagers.execute(actor, instituteId);
  }

  @Delete(':instituteId/managers/:managerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInstituteManager(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('managerId', ParseUUIDPipe) managerId: string,
  ) {
    await this.removeManager.execute(actor, instituteId, managerId);
  }
}
