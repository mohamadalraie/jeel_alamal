'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, BookOpen, X, Check } from 'lucide-react';
import type { HeartCell } from '@/lib/types';
import { cellColors } from './recitation-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type FilterMode = 'memorized' | 'partial' | 'full' | 'all';

/**
 * Simplified & Compact Memorization Map:
 * Defaults to showing ONLY memorized/in-progress surahs to keep the page concise.
 * Includes a quick Surah dropdown selector, live search, and filter tabs.
 */
export function HeartMap({ cells }: { cells: HeartCell[] }) {
  const t = useTranslations('recitation');
  const tc = useTranslations('common');
  const tr = useTranslations('ratings');

  const [selected, setSelected] = useState<HeartCell | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('memorized');
  const [query, setQuery] = useState<string>('');

  // Calculate summary metrics
  const stats = useMemo(() => {
    let full = 0;
    let partial = 0;
    let totalAyahs = 0;

    for (const cell of cells) {
      if (cell.status === 'full') full++;
      if (cell.status === 'partial') partial++;
      totalAyahs += cell.coveredAyahs ?? 0;
    }

    const memorizedCount = full + partial;
    return { full, partial, memorizedCount, totalAyahs };
  }, [cells]);

  // Filtered cells based on selected tab + search query
  const filteredCells = useMemo(() => {
    return cells.filter((cell) => {
      // 1. Filter by mode
      if (filterMode === 'memorized' && cell.percent === 0) return false;
      if (filterMode === 'partial' && cell.status !== 'partial') return false;
      if (filterMode === 'full' && cell.status !== 'full') return false;

      // 2. Search query filter
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matchesName = cell.name.toLowerCase().includes(q);
        const matchesNum = cell.number.toString() === q;
        if (!matchesName && !matchesNum) return false;
      }

      return true;
    });
  }, [cells, filterMode, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Quick Dropdown Selector */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Quick Surah Dropdown Selector */}
        <div className="flex items-center gap-2">
          <Select
            value={selected ? String(selected.number) : ''}
            onValueChange={(val) => {
              const found = cells.find((c) => c.number === Number(val));
              if (found) setSelected(found);
            }}
          >
            <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-sm">
              <SelectValue placeholder={t('selectSurahQuick')} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {cells.map((c) => (
                <SelectItem key={c.number} value={String(c.number)}>
                  <div className="flex items-center justify-between w-full gap-4 text-xs">
                    <span>
                      {c.number}. {c.name}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {c.percent > 0 ? `٪${c.percent}` : `(${c.ayahCount} آية)`}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Live Search Bar */}
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-3 size-4" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchSurahPlaceholder')}
            className="h-10 ps-9 rounded-xl border-border bg-background text-sm placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute end-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2.5">
        <FilterTab
          active={filterMode === 'memorized'}
          onClick={() => setFilterMode('memorized')}
          count={stats.memorizedCount}
          label={t('filterMemorized')}
        />
        <FilterTab
          active={filterMode === 'partial'}
          onClick={() => setFilterMode('partial')}
          count={stats.partial}
          label={t('filterPartial')}
        />
        <FilterTab
          active={filterMode === 'full'}
          onClick={() => setFilterMode('full')}
          count={stats.full}
          label={t('filterFull')}
        />
        <FilterTab
          active={filterMode === 'all'}
          onClick={() => setFilterMode('all')}
          count={114}
          label={t('filterAll')}
        />
      </div>

      {/* Selected Surah Detail Banner */}
      {selected && (
        <div className="relative border-border bg-card/60 backdrop-blur-sm flex flex-col gap-2 rounded-xl border p-4 shadow-sm animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute end-3 top-3 text-muted-foreground hover:text-foreground rounded-full p-1 transition"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-center justify-between pe-6">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span className="font-bold text-base">
                {selected.number}. {selected.name}
              </span>
            </div>
            <Badge variant="outline" className="text-xs font-semibold">
              ٪{selected.percent}
            </Badge>
          </div>

          <div className="text-sm flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {selected.coveredAyahs} / {selected.ayahCount} {t('ayahRange')}
              </span>
              <span>{selected.status === 'full' ? t('fullSurah') : t('legendPartial')}</span>
            </div>

            {/* Progress Bar */}
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${selected.percent}%` }}
              />
            </div>

            {selected.status !== 'none' && (
              <div className="flex flex-col gap-1 pt-1 text-xs">
                <div>
                  <span className="text-muted-foreground">{t('memorized')}: </span>
                  <span className="font-medium" dir="ltr">
                    {selected.ranges.map(([f, to]) => (f === to ? `${f}` : `${f}–${to}`)).join('، ')}
                  </span>
                </div>
                {selected.status === 'full' ? (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {t('fullSurah')} — {tr(selected.rating ?? 'excellent')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t('reachedAyah', { n: (selected.nextAyah ?? 1) - 1 })} ·{' '}
                    <span className="font-medium text-primary">
                      {t('continueFrom', { n: selected.nextAyah ?? 1 })}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tiles Grid */}
      {filteredCells.length > 0 ? (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filteredCells.map((cell) => {
            const c = cellColors(cell);
            const isSelected = selected?.number === cell.number;
            return (
              <button
                type="button"
                key={cell.number}
                onClick={() => setSelected(cell)}
                style={{
                  backgroundColor: isSelected ? undefined : c.bg,
                  color: isSelected ? undefined : c.fg,
                  borderColor: isSelected ? undefined : c.border,
                }}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition hover:scale-[1.02] active:scale-95 focus:outline-none',
                  isSelected &&
                    'ring-2 ring-primary border-primary bg-primary text-primary-foreground font-bold shadow-md',
                )}
              >
                <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                  {cell.name}
                </span>
                {cell.status === 'partial' ? (
                  <span className="text-[9px] font-medium opacity-90">٪{cell.percent}</span>
                ) : cell.status === 'full' ? (
                  <span className="text-[9px] font-semibold flex items-center gap-0.5">
                    <Check className="size-2.5" /> ٪100
                  </span>
                ) : (
                  <span className="text-[9px] opacity-60">{cell.number}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="border-border bg-muted/20 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-10 px-4 text-center">
          <BookOpen className="size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
            {filterMode === 'memorized' ? t('noMemorizedSurahs') : tc('noResults')}
          </p>
          {filterMode === 'memorized' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterMode('all')}
              className="rounded-xl text-xs"
            >
              {t('showAllSurahs')}
            </Button>
          )}
        </div>
      )}

      {/* Bottom Legend */}
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
        <div className="flex items-center gap-4">
          <Legend swatch="#DC2626" label={t('legendFull')} />
          <Legend swatch="#F5C518" label={t('legendPartial')} />
          <Legend swatch="#FFFFFF" label={t('legendNone')} border />
        </div>
        {filterMode === 'memorized' && (
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="text-xs text-primary hover:underline font-medium"
          >
            {t('showAllSurahs')}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums',
          active
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-background text-muted-foreground border border-border',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function Legend({ swatch, label, border }: { swatch: string; label: string; border?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-3 rounded-full shadow-xs"
        style={{ backgroundColor: swatch, border: border ? '1px solid #d1d5db' : undefined }}
      />
      {label}
    </span>
  );
}
