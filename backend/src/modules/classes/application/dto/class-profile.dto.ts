import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
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

export class AnchorDto {
  @IsIn(['time', 'prayer'])
  kind: 'time' | 'prayer';

  @IsString()
  value: string;
}

export class ScheduleSlotDto {
  @IsIn(WEEKDAYS as unknown as string[])
  dayOfWeek: string;

  @ValidateNested()
  @Type(() => AnchorDto)
  start: AnchorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AnchorDto)
  end?: AnchorDto | null;
}

export class SetScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];
}

interface SlotView {
  id: string;
  dayOfWeek: string;
  start: { kind: string; value: string };
  end: { kind: string; value: string } | null;
}

export class SetLessonsVisibilityDto {
  @IsBoolean()
  visible: boolean;
}

export interface ClassProfileResult {
  class: {
    id: string;
    name: string;
    description: string | null;
    lessonsVisibleToStudents: boolean;
    createdAt: string;
  };
  schedule: SlotView[];
  teachers: { id: string; name: string; isSupervisor: boolean }[];
  students: { id: string; name: string; schoolGrade: string | null }[];
}
