import { pgEnum } from 'drizzle-orm/pg-core';

export const trackTypeEnum = pgEnum('track_type', ['regular', 'intensive']);

export const weekdayEnum = pgEnum('weekday', [
  'sat',
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
]);

export const anchorKindEnum = pgEnum('anchor_kind', ['time', 'prayer']);
