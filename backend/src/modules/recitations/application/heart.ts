import { Recitation } from '../domain/recitation.entity';
import { RecitationRating } from '../domain/recitation-rating';
import { SURAHS } from '../domain/quran';
import { HeartCell } from './dto/recitation.dto';

/** Do the merged ayah intervals fully cover [1, ayahCount]? */
function coversWhole(
  ranges: { from: number; to: number }[],
  ayahCount: number,
): boolean {
  if (ranges.length === 0) return false;
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  // Walk contiguously from ayah 1.
  let reached = 0; // highest contiguous ayah covered starting at 1
  for (const r of sorted) {
    if (r.from > reached + 1) break; // gap
    reached = Math.max(reached, r.to);
  }
  return reached >= ayahCount;
}

/**
 * Builds the 114-cell heart map for a student from their recitations.
 * - none: no recitation for the surah (white)
 * - partial: some coverage but not the whole surah (yellow)
 * - full: whole surah covered (colored by the LATEST recitation's rating)
 * `recitations` must be newest-first (so index 0 per surah is the latest).
 */
export function buildHeart(recitations: Recitation[]): HeartCell[] {
  const bySurah = new Map<number, Recitation[]>();
  for (const r of recitations) {
    (bySurah.get(r.surahNumber) ?? bySurah.set(r.surahNumber, []).get(r.surahNumber)!).push(r);
  }

  return SURAHS.map((surah) => {
    const recs = bySurah.get(surah.number) ?? [];
    if (recs.length === 0) {
      return {
        number: surah.number,
        name: surah.name,
        ayahCount: surah.ayahCount,
        status: 'none' as const,
        rating: null,
      };
    }
    const full = coversWhole(
      recs.map((r) => ({ from: r.fromAyah, to: r.toAyah })),
      surah.ayahCount,
    );
    // recs are newest-first → first element is the latest recitation.
    const latestRating: RecitationRating = recs[0].rating;
    return {
      number: surah.number,
      name: surah.name,
      ayahCount: surah.ayahCount,
      status: full ? ('full' as const) : ('partial' as const),
      rating: latestRating,
    };
  });
}
