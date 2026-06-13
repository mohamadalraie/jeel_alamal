import { BusinessRuleError } from './domain.error';

/**
 * Student grades from الأول (g1) to البكالوريا (g12). Stored as a stable key;
 * Arabic/English labels live in the frontend i18n bundles. Constrained so the
 * value is always one of the known grades (spec 003).
 */
export const STUDENT_GRADES = [
  'g1',
  'g2',
  'g3',
  'g4',
  'g5',
  'g6',
  'g7',
  'g8',
  'g9',
  'g10',
  'g11',
  'g12',
] as const;

export type StudentGrade = (typeof STUDENT_GRADES)[number];

export function assertValidGrade(grade: string | null | undefined): void {
  if (grade == null || grade === '') return;
  if (!STUDENT_GRADES.includes(grade as StudentGrade)) {
    throw new BusinessRuleError(`Invalid student grade: ${grade}`);
  }
}
