import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClassesModule } from '../classes/classes.module';
import { InstitutesModule } from '../institutes/institutes.module';
import { AttendanceController } from './presentation/attendance.controller';
import {
  TakeAttendanceUseCase,
  GetClassAttendanceUseCase,
  GetSessionUseCase,
  GetStudentAttendanceUseCase,
} from './application/attendance.use-cases';
import { ATTENDANCE_REPOSITORY } from './domain/attendance.repository';
import { DrizzleAttendanceRepository } from './infrastructure/persistence/drizzle-attendance.repository';

/**
 * Attendance (الحضور) — spec 007. Reuses USER_REPOSITORY, CLASS_REPOSITORY, and
 * the InstituteAccessPolicy exported by their modules.
 */
@Module({
  imports: [UsersModule, ClassesModule, InstitutesModule],
  controllers: [AttendanceController],
  providers: [
    TakeAttendanceUseCase,
    GetClassAttendanceUseCase,
    GetSessionUseCase,
    GetStudentAttendanceUseCase,
    { provide: ATTENDANCE_REPOSITORY, useClass: DrizzleAttendanceRepository },
  ],
})
export class AttendanceModule {}
