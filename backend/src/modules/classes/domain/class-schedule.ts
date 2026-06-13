import { BusinessRuleError } from '../../../shared/domain/domain.error';

/** Days of the week, Arabic-week order (Saturday first). */
export const WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface ScheduleSlot {
  dayOfWeek: Weekday;
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validates a weekly slot: known day, valid times, end after start. */
export function assertValidSlot(slot: ScheduleSlot): void {
  if (!WEEKDAYS.includes(slot.dayOfWeek)) {
    throw new BusinessRuleError(`Invalid day: ${slot.dayOfWeek}`);
  }
  if (!TIME.test(slot.startTime) || !TIME.test(slot.endTime)) {
    throw new BusinessRuleError('Times must be in HH:MM format');
  }
  if (slot.endTime <= slot.startTime) {
    throw new BusinessRuleError('End time must be after start time');
  }
}
