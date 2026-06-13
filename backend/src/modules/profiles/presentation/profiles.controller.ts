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
import {
  GetTeacherProfileUseCase,
  UpdateTeacherBasicUseCase,
  UpdateTeacherDetailsUseCase,
} from '../application/use-cases/teacher-profile.use-cases';
import {
  AddCertificationUseCase,
  RemoveCertificationUseCase,
} from '../application/use-cases/certification.use-cases';
import {
  GetStudentProfileUseCase,
  UpdateStudentUseCase,
  ChangeStudentClassUseCase,
} from '../application/use-cases/student-profile.use-cases';
import {
  ListStudentNotesUseCase,
  AddStudentNoteUseCase,
  UpdateStudentNoteUseCase,
  DeleteStudentNoteUseCase,
} from '../application/use-cases/student-note.use-cases';
import { DeleteMemberUseCase } from '../application/use-cases/delete-member.use-case';
import {
  AddCertificationDto,
  ChangeClassDto,
  NoteBodyDto,
  UpdateBasicInfoDto,
  UpdateTeacherDetailsDto,
} from '../application/dto/profile.dto';

/**
 * Profile endpoints (spec 002). All institute-scoped; each use-case authorises
 * the actor and enforces tenant isolation. Routes live under the institute so
 * the tenant context is explicit in the URL.
 */
@Controller('institutes/:instituteId')
export class ProfilesController {
  constructor(
    private readonly getTeacher: GetTeacherProfileUseCase,
    private readonly updateTeacherBasic: UpdateTeacherBasicUseCase,
    private readonly updateTeacherDetails: UpdateTeacherDetailsUseCase,
    private readonly addCertification: AddCertificationUseCase,
    private readonly removeCertification: RemoveCertificationUseCase,
    private readonly getStudent: GetStudentProfileUseCase,
    private readonly updateStudent: UpdateStudentUseCase,
    private readonly changeStudentClass: ChangeStudentClassUseCase,
    private readonly listNotes: ListStudentNotesUseCase,
    private readonly addNote: AddStudentNoteUseCase,
    private readonly updateNote: UpdateStudentNoteUseCase,
    private readonly deleteNote: DeleteStudentNoteUseCase,
    private readonly deleteMember: DeleteMemberUseCase,
  ) {}

  // ── Teacher profile ──
  @Get('teachers/:teacherId')
  teacherProfile(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
  ) {
    return this.getTeacher.execute(actor, instituteId, teacherId);
  }

  @Patch('teachers/:teacherId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async editTeacherBasic(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Body() dto: UpdateBasicInfoDto,
  ) {
    await this.updateTeacherBasic.execute(actor, instituteId, teacherId, dto);
  }

  @Patch('teachers/:teacherId/details')
  @HttpCode(HttpStatus.NO_CONTENT)
  async editTeacherDetails(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Body() dto: UpdateTeacherDetailsDto,
  ) {
    await this.updateTeacherDetails.execute(actor, instituteId, teacherId, dto);
  }

  @Post('teachers/:teacherId/certifications')
  @HttpCode(HttpStatus.CREATED)
  addCert(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Body() dto: AddCertificationDto,
  ) {
    return this.addCertification.execute(actor, instituteId, teacherId, dto);
  }

  @Delete('certifications/:certId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCert(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('certId', ParseUUIDPipe) certId: string,
  ) {
    await this.removeCertification.execute(actor, instituteId, certId);
  }

  // ── Student profile ──
  @Get('students/:studentId')
  studentProfile(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.getStudent.execute(actor, instituteId, studentId);
  }

  @Patch('students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async editStudent(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: UpdateBasicInfoDto,
  ) {
    await this.updateStudent.execute(actor, instituteId, studentId, dto);
  }

  @Put('students/:studentId/class')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeClass(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: ChangeClassDto,
  ) {
    await this.changeStudentClass.execute(
      actor,
      instituteId,
      studentId,
      dto.classId ?? null,
    );
  }

  // ── Student notes (never exposed to students) ──
  @Get('students/:studentId/notes')
  notes(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.listNotes.execute(actor, instituteId, studentId);
  }

  @Post('students/:studentId/notes')
  @HttpCode(HttpStatus.CREATED)
  createNote(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: NoteBodyDto,
  ) {
    return this.addNote.execute(actor, instituteId, studentId, dto.body);
  }

  @Patch('notes/:noteId')
  editNote(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: NoteBodyDto,
  ) {
    return this.updateNote.execute(actor, instituteId, noteId, dto.body);
  }

  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeNote(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    await this.deleteNote.execute(actor, instituteId, noteId);
  }

  // ── Delete a member (teacher/student) ──
  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser() actor: Actor,
    @Param('instituteId', ParseUUIDPipe) instituteId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    await this.deleteMember.execute(actor, instituteId, memberId);
  }
}
