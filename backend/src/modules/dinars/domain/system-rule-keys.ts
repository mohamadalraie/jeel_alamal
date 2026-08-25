import {
  AttendanceStatus,
  ATTENDANCE_STATUSES,
} from '../../attendance/domain/attendance-status';
import {
  RecitationRating,
  RECITATION_RATINGS,
} from '../../recitations/domain/recitation-rating';
import { DinarContext } from './dinar-context';

/**
 * The fixed set of seeded, non-deletable system rules (spec 010). Each attendance
 * status and each recitation rating maps to exactly one rule slot per institute.
 * Keys are derived from the existing enums so they never drift out of sync.
 */

export const attendanceStatusToKey = (status: AttendanceStatus): string =>
  `attendance.${status}`;

export const recitationRatingToKey = (rating: RecitationRating): string =>
  `recitation.${rating}`;

export interface SystemRuleDefault {
  systemKey: string;
  context: DinarContext;
}

/** Every system-rule slot with its context. Amount defaults to 0, inactive. */
export const SYSTEM_RULE_DEFAULTS: SystemRuleDefault[] = [
  ...ATTENDANCE_STATUSES.map((s) => ({
    systemKey: attendanceStatusToKey(s),
    context: DinarContext.Attendance,
  })),
  ...RECITATION_RATINGS.map((r) => ({
    systemKey: recitationRatingToKey(r),
    context: DinarContext.Recitation,
  })),
];

export const SYSTEM_RULE_KEYS: string[] = SYSTEM_RULE_DEFAULTS.map(
  (d) => d.systemKey,
);
