import { BusinessRuleError } from '../../../shared/domain/domain.error';

/** Days of the week, Arabic-week order (Saturday first). */
export const WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** The five daily prayers used as schedule anchors (spec 004). */
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

export type AnchorKind = 'time' | 'prayer';

/** A point in a lesson slot: a clock time ('HH:MM') or a prayer. */
export interface Anchor {
  kind: AnchorKind;
  value: string;
}

export interface ScheduleSlot {
  dayOfWeek: Weekday;
  start: Anchor;
  end: Anchor | null; // optional (spec 004)
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function assertAnchor(a: Anchor, label: string): void {
  if (a.kind === 'time') {
    if (!TIME.test(a.value)) {
      throw new BusinessRuleError(`${label} time must be in HH:MM format`);
    }
  } else if (a.kind === 'prayer') {
    if (!PRAYERS.includes(a.value as Prayer)) {
      throw new BusinessRuleError(`${label} prayer is invalid`);
    }
  } else {
    throw new BusinessRuleError(`${label} anchor kind is invalid`);
  }
}

/** Validates a weekly slot. End is optional; when both ends are clock times, end > start. */
export function assertValidSlot(slot: ScheduleSlot): void {
  if (!WEEKDAYS.includes(slot.dayOfWeek)) {
    throw new BusinessRuleError(`Invalid day: ${slot.dayOfWeek}`);
  }
  assertAnchor(slot.start, 'Start');
  if (slot.end) {
    assertAnchor(slot.end, 'End');
    if (
      slot.start.kind === 'time' &&
      slot.end.kind === 'time' &&
      slot.end.value <= slot.start.value
    ) {
      throw new BusinessRuleError('End time must be after start time');
    }
  }
}
