import type { AttendanceStatus } from '@/lib/types';

/**
 * Attendance status colors (spec 007), kept in one reviewable place:
 * green = present, red = absent, amber = justified, blue = late.
 * Used for status buttons, badges, and the distribution chart.
 */
export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: '#16A34A', // green
  absent: '#DC2626', // red
  justified: '#D97706', // amber
  late: '#2563EB', // blue
};

/** Order used everywhere statuses are listed (buttons, legends, charts). */
export const STATUS_ORDER: AttendanceStatus[] = [
  'present',
  'late',
  'justified',
  'absent',
];
