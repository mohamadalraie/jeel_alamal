/**
 * Behaviour class of a dinar transaction (spec 010).
 * - `manual_rule` / `exceptional` → immutable ledger; corrections are compensating
 *   reversal entries.
 * - `attendance` / `recitation` → projections of a source record; reconciled by
 *   natural key and replaced in place (no reversal entries).
 */
export enum DinarSourceType {
  ManualRule = 'manual_rule',
  Exceptional = 'exceptional',
  Attendance = 'attendance',
  Recitation = 'recitation',
}

export const DINAR_SOURCE_TYPES = Object.values(DinarSourceType);

/** The two automatic source types are projections reconciled by `source_ref`. */
export const AUTOMATIC_SOURCE_TYPES: DinarSourceType[] = [
  DinarSourceType.Attendance,
  DinarSourceType.Recitation,
];

export const isAutomaticSource = (t: DinarSourceType): boolean =>
  AUTOMATIC_SOURCE_TYPES.includes(t);
