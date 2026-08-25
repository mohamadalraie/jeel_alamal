import { Recitation } from '../domain/recitation.entity';
import { RecitationRating } from '../domain/recitation-rating';
import { SURAHS } from '../domain/quran';
import { HeartCell } from './dto/recitation.dto';

/** Merge overlapping/adjacent [from,to] ranges into sorted non-overlapping ones. */
function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const [from, to] = sorted[i];
    if (from <= last[1] + 1) {
      last[1] = Math.max(last[1], to); // overlap or adjacent → extend
    } else {
      merged.push([from, to]);
    }
  }
  return merged;
}

/**
 * Builds the 114-cell heart map for a student (spec 005 + 006 enrichment):
 * status, latest rating, covered ayahs, completion %, the merged memorized
 * ranges, and the first not-yet-memorized ayah (where to continue).
 * `recitations` must be newest-first (so per surah index 0 is the latest).
 */
export function buildHeart(recitations: Recitation[]): HeartCell[] {
  const bySurah = new Map<number, Recitation[]>();
  for (const r of recitations) {
    const arr = bySurah.get(r.surahNumber);
    if (arr) arr.push(r);
    else bySurah.set(r.surahNumber, [r]);
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
        coveredAyahs: 0,
        percent: 0,
        nextAyah: 1,
        ranges: [],
      };
    }

    const merged = mergeRanges(
      recs.map((r) => [r.fromAyah, r.toAyah] as [number, number]),
    );
    const coveredAyahs = merged.reduce((sum, [f, t]) => sum + (t - f + 1), 0);

    // First uncovered ayah in 1..ayahCount (where the student should continue).
    let reached = 0;
    let nextAyah: number | null = null;
    for (const [f, t] of merged) {
      if (f > reached + 1) {
        nextAyah = reached + 1;
        break;
      }
      reached = Math.max(reached, t);
    }
    if (nextAyah === null && reached < surah.ayahCount) nextAyah = reached + 1;

    const full = nextAyah === null;
    return {
      number: surah.number,
      name: surah.name,
      ayahCount: surah.ayahCount,
      status: full ? ('full' as const) : ('partial' as const),
      rating: recs[0].rating, // latest
      coveredAyahs,
      percent: Math.round((coveredAyahs / surah.ayahCount) * 100),
      nextAyah,
      ranges: merged,
    };
  });
}
