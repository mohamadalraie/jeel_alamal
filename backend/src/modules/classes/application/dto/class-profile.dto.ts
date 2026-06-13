import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WEEKDAYS } from '../../domain/class-schedule';

export class UpdateClassDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ScheduleSlotDto {
  @IsIn(WEEKDAYS as unknown as string[])
  dayOfWeek: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM' })
  endTime: string;
}

export class SetScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}

export interface ClassProfileResult {
  class: { id: string; name: string; description: string | null; createdAt: string };
  schedule: { id: string; dayOfWeek: string; startTime: string; endTime: string }[];
  teachers: { id: string; name: string; isSupervisor: boolean }[];
  students: { id: string; name: string; schoolGrade: string | null }[];
}
