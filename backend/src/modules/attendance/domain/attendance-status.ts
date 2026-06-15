/**
 * Attendance status for a student in a single lesson (spec 007).
 * Shared by entity, DTO, and persistence.
 */
export enum AttendanceStatus {
  Present = 'present',
  Absent = 'absent',
  Justified = 'justified', // justified/excused leave (إجازة / غياب بعذر)
  Late = 'late',
}

export const ATTENDANCE_STATUSES = Object.values(AttendanceStatus);

/** Statuses that count as "attended" for the attendance-rate metric. */
export const ATTENDED_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.Present,
  AttendanceStatus.Late,
];
