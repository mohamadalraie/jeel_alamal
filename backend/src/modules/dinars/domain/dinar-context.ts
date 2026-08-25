/**
 * Where a dinar belongs — used for display/filtering (spec 010). Manual awards
 * from a profile use `general`; from the live lesson use `lesson`; a manual
 * recitation rule uses `recitation`. Automatic projections use `attendance` or
 * `recitation`.
 */
export enum DinarContext {
  Lesson = 'lesson',
  Recitation = 'recitation',
  Attendance = 'attendance',
  General = 'general',
}

export const DINAR_CONTEXTS = Object.values(DinarContext);

/** How a rule fires. Manual = a teacher/manager awards it; automatic = a system event does. */
export enum DinarTrigger {
  Manual = 'manual',
  Automatic = 'automatic',
}

export const DINAR_TRIGGERS = Object.values(DinarTrigger);
