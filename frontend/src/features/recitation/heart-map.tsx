'use client';

import { useTranslations } from 'next-intl';
import type { HeartCell } from '@/lib/types';
import { cellColors } from './recitation-colors';

/**
 * Memorization map: 114 surah tiles in order, colored by recitation status
 * (spec 005). Responsive grid, mobile-first. A future anatomical-heart SVG can
 * replace this grid without changing the data.
 */
export function HeartMap({ cells }: { cells: HeartCell[] }) {
  const t = useTranslations('recitation');
  const tr = useTranslations('ratings');

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {cells.map((cell) => {
          const c = cellColors(cell);
          const title =
            cell.status === 'full'
              ? `${cell.name} — ${tr(cell.rating ?? 'excellent')}`
              : cell.status === 'partial'
                ? `${cell.name} — ${t('legendPartial')}`
                : `${cell.name} — ${t('legendNone')}`;
          return (
            <div
              key={cell.number}
              title={title}
              style={{ backgroundColor: c.bg, color: c.fg, borderColor: c.border }}
              className="flex min-h-12 flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center"
            >
              <span className="text-[11px] font-semibold leading-tight">{cell.name}</span>
              <span className="text-[9px] opacity-70">{cell.number}</span>
            </div>
          );
        })}
      </div>

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
