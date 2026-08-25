import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { ClassesModule } from '../classes/classes.module';
import { ProfilesController } from './presentation/profiles.controller';
import { ProfileAccessPolicy } from './application/profile-access.policy';
import {
  GetTeacherProfileUseCase,
  UpdateTeacherBasicUseCase,
  UpdateTeacherDetailsUseCase,
} from './application/use-cases/teacher-profile.use-cases';
import {
  AddCertificationUseCase,
  RemoveCertificationUseCase,
} from './application/use-cases/certification.use-cases';
import {
  GetStudentProfileUseCase,
  UpdateStudentUseCase,
  ChangeStudentClassUseCase,
} from './application/use-cases/student-profile.use-cases';
import {
  ListStudentNotesUseCase,
  AddStudentNoteUseCase,
  UpdateStudentNoteUseCase,
  DeleteStudentNoteUseCase,
} from './application/use-cases/student-note.use-cases';
import { DeleteMemberUseCase } from './application/use-cases/delete-member.use-case';
import { CERTIFICATION_REPOSITORY } from './domain/teacher-certification.repository';
import { STUDENT_NOTE_REPOSITORY } from './domain/student-note.repository';
import { DrizzleCertificationRepository } from './infrastructure/persistence/drizzle-certification.repository';
import { DrizzleStudentNoteRepository } from './infrastructure/persistence/drizzle-student-note.repository';

/**
 * Composition root for profiles (spec 002). Reuses USER_REPOSITORY (users),
 * MANAGER_ASSIGNMENTS (institutes), and CLASS_REPOSITORY (classes) — all
 * exported by their owning modules.
 */
@Module({
  imports: [UsersModule, InstitutesModule, ClassesModule],
  controllers: [ProfilesController],
  providers: [
    ProfileAccessPolicy,
    GetTeacherProfileUseCase,
    UpdateTeacherBasicUseCase,
    UpdateTeacherDetailsUseCase,
    AddCertificationUseCase,
    RemoveCertificationUseCase,
    GetStudentProfileUseCase,
    UpdateStudentUseCase,
    ChangeStudentClassUseCase,
    ListStudentNotesUseCase,
    AddStudentNoteUseCase,
    UpdateStudentNoteUseCase,
    DeleteStudentNoteUseCase,
    DeleteMemberUseCase,
    {
      provide: CERTIFICATION_REPOSITORY,
      useClass: DrizzleCertificationRepository,
    },
    {
      provide: STUDENT_NOTE_REPOSITORY,
      useClass: DrizzleStudentNoteRepository,
    },
  ],
})
export class ProfilesModule {}
