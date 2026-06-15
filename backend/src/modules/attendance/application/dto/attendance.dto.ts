import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../domain/attendance-status';

export class AttendanceEntryDto {
  @IsUUID()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

export class TakeAttendanceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}

/** Count of each status (always all four keys present, zero-filled). */
export interface AttendanceStatusCounts {
  present: number;
  absent: number;
  justified: number;
  late: number;
}

/** Per-student aggregate over all the class's sessions. */
export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  counts: AttendanceStatusCounts;
  total: number; // number of sessions the student was recorded in
  /** attended (present + late) / total, 0..100. */
  rate: number;
}

/** A single attendance session in the class overview. */
export interface SessionSummary {
  date: string;
  counts: AttendanceStatusCounts;
  total: number;
}

export interface ClassAttendanceResult {
  totals: AttendanceStatusCounts;
  /** Overall attendance rate across all records, 0..100. */
  rate: number;
  sessionCount: number;
  sessions: SessionSummary[]; // newest first
  students: StudentAttendanceStats[]; // by name
  /** Class roster — for the take-attendance screen. */
  roster: { id: string; name: string }[];
}

/** One row in a student's attendance log. */
export interface StudentAttendanceItem {
  date: string;
  status: AttendanceStatus;
}

export interface StudentAttendanceResult {
  counts: AttendanceStatusCounts;
  total: number;
  rate: number;
  log: StudentAttendanceItem[]; // newest first
}

/** Existing session detail, for pre-filling the take-attendance screen. */
export interface SessionDetailResult {
  date: string;
  entries: { studentId: string; status: AttendanceStatus }[];
}
