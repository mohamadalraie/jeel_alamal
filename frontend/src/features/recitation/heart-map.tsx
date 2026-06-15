'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { HeartCell } from '@/lib/types';
import { cellColors } from './recitation-colors';

/**
 * Memorization map: 114 surah tiles colored by status, each showing its
 * completion %. Tapping a tile reveals the memorized vs remaining detail
 * (spec 006). Responsive, mobile-first.
 */
export function HeartMap({ cells }: { cells: HeartCell[] }) {
  const t = useTranslations('recitation');
  const tr = useTranslations('ratings');
  const [selected, setSelected] = useState<HeartCell | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {cells.map((cell) => {
          const c = cellColors(cell);
          return (
            <button
              type="button"
              key={cell.number}
              onClick={() => setSelected(cell)}
              style={{ backgroundColor: c.bg, color: c.fg, borderColor: c.border }}
              className="flex min-h-12 flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center transition hover:opacity-90 focus:outline-none focus-visible:ring-2"
            >
              <span className="text-[11px] font-semibold leading-tight">{cell.name}</span>
              {cell.status === 'partial' ? (
                <span className="text-[9px] font-medium">٪{cell.percent}</span>
              ) : (
                <span className="text-[9px] opacity-70">{cell.number}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected-surah detail */}
      {selected && (
        <div className="border-border bg-muted/30 flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {selected.number}. {selected.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {selected.coveredAyahs} / {selected.ayahCount} ({t('ayahRange')}) · ٪{selected.percent}
            </span>
          </div>
          {selected.status === 'none' ? (
            <span className="text-muted-foreground">{t('legendNone')}</span>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground text-xs">{t('memorized')}: </span>
                <span dir="ltr">
                  {selected.ranges.map(([f, to]) => (f === to ? `${f}` : `${f}–${to}`)).join('، ')}
                </span>
              </div>
              {selected.status === 'full' ? (
                <span className="text-xs font-medium" style={{ color: cellColors(selected).bg }}>
                  {t('fullSurah')} — {tr(selected.rating ?? 'excellent')}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {t('reachedAyah', { n: (selected.nextAyah ?? 1) - 1 })} ·{' '}
                  {t('continueFrom', { n: selected.nextAyah ?? 1 })}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <Legend swatch="#DC2626" label={t('legendFull')} />
        <Legend swatch="#F5C518" label={t('legendPartial')} />
        <Legend swatch="#FFFFFF" label={t('legendNone')} border />
      </div>
    </div>
  );
}

function Legend({ swatch, label, border }: { swatch: string; label: string; border?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-3 rounded"
        style={{ backgroundColor: swatch, border: border ? '1px solid #d1d5db' : undefined }}
      />
      {label}
    </span>
  );
}
