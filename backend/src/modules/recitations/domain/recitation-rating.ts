/** Recitation quality scale (ضعيف → ممتاز). Shared by entity, DTO, persistence. */
export enum RecitationRating {
  Excellent = 'excellent',
  VeryGood = 'very_good',
  Good = 'good',
  Acceptable = 'acceptable',
  Weak = 'weak',
}

export const RECITATION_RATINGS = Object.values(RecitationRating);
