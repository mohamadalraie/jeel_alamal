import type { HeartCell, RecitationRating } from '@/lib/types';

/**
 * Heart-tile colors (spec 005): white = never recited, yellow = partial,
 * red→light-pink gradient by rating when the whole surah is recited.
 */
const RATING_BG: Record<RecitationRating, string> = {
  excellent: '#DC2626', // red
  very_good: '#E85C6A',
  good: '#F0869A',
  acceptable: '#F5AEC0',
  weak: '#FBD8E1', // light pink
};

const DARK_TEXT_RATINGS: RecitationRating[] = ['good', 'acceptable', 'weak'];

export function cellColors(cell: HeartCell): { bg: string; fg: string; border: string } {
  if (cell.status === 'none') {
    return { bg: '#FFFFFF', fg: '#1f2937', border: '#e5e7eb' };
  }
  if (cell.status === 'partial') {
    return { bg: '#F5C518', fg: '#3a2f00', border: '#e0b400' }; // yellow
  }
  const rating = cell.rating ?? 'excellent';
  const bg = RATING_BG[rating];
  const fg = DARK_TEXT_RATINGS.includes(rating) ? '#3a0a14' : '#ffffff';
  return { bg, fg, border: bg };
}

/** Solid swatch for a rating (used in the rating dropdown / log badges). */
export const ratingColor = (rating: RecitationRating): string => RATING_BG[rating];
