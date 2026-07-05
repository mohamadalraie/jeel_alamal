/**
 * The delivery status of a single lesson-class binding (spec 009). Status lives
 * on the binding (not the shared lesson) because the same lesson may be
 * delivered by different teachers to different classes independently.
 *
 * Transitions:
 *   pending → started → finished | over_time | under_time   (teacher flow)
 *   pending → not_given                                     (date passed, never started)
 *
 * `not_given` is never written; it is derived lazily on read (FR-007).
 */
export type LessonBindingStatus =
  | 'pending'
  | 'started'
  | 'finished'
  | 'not_given'
  | 'over_time'
  | 'under_time';

/** The terminal statuses assigned when a teacher ends a lesson. */
export type FinalLessonStatus = 'finished' | 'over_time' | 'under_time';

/** The statuses actually persisted to the database (never `not_given`). */
export type StoredLessonStatus = Exclude<LessonBindingStatus, 'not_given'>;

/**
 * Derive the status shown to readers. A binding still `pending` whose lesson
 * date is strictly before today is surfaced as `not_given` without any write.
 * All other statuses pass through unchanged.
 *
 * @param raw   the persisted status
 * @param date  the lesson date, 'YYYY-MM-DD'
 * @param today today's date, 'YYYY-MM-DD' (caller supplies for testability)
 */
export function deriveReadStatus(
  raw: StoredLessonStatus,
  date: string,
  today: string,
): LessonBindingStatus {
  if (raw === 'pending' && date < today) return 'not_given';
  return raw;
}
