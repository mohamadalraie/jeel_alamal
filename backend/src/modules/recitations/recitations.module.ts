import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { DinarsModule } from '../dinars/dinars.module';
import { RecitationsController } from './presentation/recitations.controller';
import {
  ListSurahsUseCase,
  AddRecitationUseCase,
  GetStudentRecitationUseCase,
  GetClassRecitationUseCase,
} from './application/recitation.use-cases';
import { RECITATION_REPOSITORY } from './domain/recitation.repository';
import { DrizzleRecitationRepository } from './infrastructure/persistence/drizzle-recitation.repository';

/**
 * Quran recitation (تسميع) — spec 005. Reuses USER_REPOSITORY, CLASS_REPOSITORY,
 * and the InstituteAccessPolicy exported by their modules.
 */
@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule, DinarsModule],
  controllers: [RecitationsController],
  providers: [
    ListSurahsUseCase,
    AddRecitationUseCase,
    GetStudentRecitationUseCase,
    GetClassRecitationUseCase,
    { provide: RECITATION_REPOSITORY, useClass: DrizzleRecitationRepository },
  ],
})
export class RecitationsModule {}
