'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BookMarked,
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Plus,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { toYMD } from '@/features/attendance/calendar-utils';
import { EmptyState } from '@/features/shared/empty-state';
import { Button } from '@/components/ui/button';
import { statusColor } from './lesson-status-badge';

const TODAY_YMD = toYMD(new Date());

// ── Week helpers ─────────────────────────────────────────────────────────────

/** Monday of the week containing `d`. */
function weekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // days back to Monday
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// ── Grouping ─────────────────────────────────────────────────────────────────

interface MonthGroup {
  month: string; // YYYY-MM
  days: { ymd: string; entries: ProgramEntry[] }[];
}

function groupByMonth(entries: ProgramEntry[]): MonthGroup[] {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.sort - b.sort,
  );
  const byDate = new Map<string, ProgramEntry[]>();
  for (const e of sorted) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const byMonth = new Map<string, { ymd: string; entries: ProgramEntry[] }[]>();
  for (const [ymd, list] of byDate) {
    const key = ymd.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push({ ymd, entries: list });
  }
  return [...byMonth.entries()].map(([month, days]) => ({ month, days }));
}

// ── Public component ─────────────────────────────────────────────────────────

/**
 * Shared lessons list: chronological, grouped by month → day.
 * Defaults to "this week" view with ± navigation; a toggle switches to the
 * full programme (all dates). Used by the hub, the class tab, and the teacher
 * feed so every page looks identical.
 */
export function LessonProgramList({
  entries,
  emptyText,
  showTeacher = false,
  showClass = false,
  renderActions,
  onAddDay,
}: {
  entries: ProgramEntry[];
  emptyText: string;
  showTeacher?: boolean;
  showClass?: boolean;
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
  onAddDay?: (ymd: string) => void;
}) {
  const t = useTranslations('lessons');
  const locale = useLocale();

  const [view, setView] = useState<'week' | 'all'>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => weekMonday(new Date()));

  const weekEnd = addDays(weekStart, 6);
  const weekStartYMD = toYMD(weekStart);
  const weekEndYMD = toYMD(weekEnd);

  // Entries visible in the current view
  const visibleEntries = useMemo(() => {
    if (view === 'all') return entries;
    return entries.filter((e) => e.date >= weekStartYMD && e.date <= weekEndYMD);
  }, [entries, view, weekStartYMD, weekEndYMD]);

  const months = useMemo(() => groupByMonth(visibleEntries), [visibleEntries]);

  const isCurrentWeek = weekStartYMD === toYMD(weekMonday(new Date()));

  const weekLabel = `${weekStart.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;

  const Prev = locale === 'ar' ? ChevronRight : ChevronLeft;
  const Next = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls: one clear navigator + a small view toggle underneath it */}
      <div className="flex flex-col items-center gap-2.5">
        {view === 'week' ? (
          <div className="flex w-full items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              aria-label="Previous week"
            >
              <Prev className="size-4" />
            </Button>
            <div className="flex min-w-36 flex-col items-center">
              <span className="text-base font-bold tabular-nums">{weekLabel}</span>
              {isCurrentWeek ? (
                <span className="text-primary text-[11px] font-medium">{t('thisWeek')}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setWeekStart(weekMonday(new Date()))}
                  className="text-muted-foreground hover:text-primary text-[11px] font-medium underline-offset-2 hover:underline"
                >
                  {t('goToToday')}
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              aria-label="Next week"
            >
              <Next className="size-4" />
            </Button>
          </div>
        ) : (
          <span className="text-base font-bold">{t('programView')}</span>
        )}

        {/* View toggle */}
        <div className="bg-muted/60 flex items-center gap-0.5 rounded-full p-0.5">
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => setView('week')}
          >
            <CalendarClock className="size-3.5" />
            {t('weekView')}
          </Button>
          <Button
            variant={view === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 rounded-full px-3 text-xs"
            onClick={() => setView('all')}
          >
            <LayoutList className="size-3.5" />
            {t('programView')}
          </Button>
        </div>
      </div>

      {/* List */}
      {months.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={view === 'week' ? t('noLessonsThisWeek') : emptyText}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {months.map(({ month, days }) => (
            <MonthSection
              key={month}
              month={month}
              days={days}
              locale={locale}
              showTeacher={showTeacher}
              showClass={showClass}
              renderActions={renderActions}
              onAddDay={onAddDay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MonthSection ─────────────────────────────────────────────────────────────

function MonthSection({
  month,
  days,
  locale,
  showTeacher,
  showClass,
  renderActions,
  onAddDay,
}: {
  month: string;
  days: { ymd: string; entries: ProgramEntry[] }[];
  locale: string;
  showTeacher: boolean;
  showClass: boolean;
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
  onAddDay?: (ymd: string) => void;
}) {
  const monthLabel = new Date(month + '-15').toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground px-1 text-xs font-semibold uppercase tracking-wide">
        {monthLabel}
      </span>

      <div className="flex flex-col gap-1.5">
        {days.map(({ ymd, entries }) => (
          <DayRow
            key={ymd}
            ymd={ymd}
            entries={entries}
            locale={locale}
            showTeacher={showTeacher}
            showClass={showClass}
            renderActions={renderActions}
            onAddDay={onAddDay}
          />
        ))}
      </div>
    </div>
  );
}

// ── DayRow ───────────────────────────────────────────────────────────────────

function DayRow({
  ymd,
  entries,
  locale,
  showTeacher,
  showClass,
  renderActions,
  onAddDay,
}: {
  ymd: string;
  entries: ProgramEntry[];
  locale: string;
  showTeacher: boolean;
  showClass: boolean;
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
  onAddDay?: (ymd: string) => void;
}) {
  const t = useTranslations('lessons');
  const isToday = ymd === TODAY_YMD;
  const dateObj = new Date(ymd + 'T12:00:00');
  const dayNum = dateObj.getDate();
  const dayName = dateObj.toLocaleDateString(locale, { weekday: 'short' });

  return (
    <div
      className={`flex gap-2.5 rounded-xl p-2.5 transition sm:gap-3 sm:p-3 ${
        isToday ? 'bg-primary/5' : 'bg-card'
      }`}
    >
      {/* Date badge */}
      <div
        className={`flex w-10 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 sm:w-11 ${
          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        <span className="text-base font-bold leading-tight sm:text-lg">{dayNum}</span>
        <span className="text-[10px] leading-tight opacity-80">{dayName}</span>
      </div>

      {/* Lessons stacked, separated by dividers */}
      <div className="divide-border flex min-w-0 flex-1 flex-col divide-y">
        {entries.map((e, idx) => (
          <div key={e.lessonClassId} className="py-2 first:pt-0 last:pb-0">
            <ProgramEntryRow
              entry={e}
              index={entries.length > 1 ? idx + 1 : 0}
              showTeacher={showTeacher}
              showClass={showClass}
              actions={renderActions?.(e)}
              t={t}
            />
          </div>
        ))}
        {onAddDay && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onAddDay(ymd)}
              className="text-muted-foreground hover:text-primary flex w-full items-center justify-center gap-1 rounded-lg py-1 text-xs transition"
            >
              <Plus className="size-3.5" />
              {t('addLesson')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ProgramEntryRow ──────────────────────────────────────────────────────────

/** Everything that isn't the lesson name/status, joined into one muted line. */
function metaParts(
  entry: ProgramEntry,
  showTeacher: boolean,
  showClass: boolean,
  t: (key: string, values?: Record<string, string | number>) => string,
): string[] {
  const parts: string[] = [];
  if (showClass) parts.push(entry.className);
  if (showTeacher) parts.push(entry.teacher.name);
  if (entry.category) parts.push(entry.category.name);
  if (entry.expectedDurationMinutes != null) {
    const actualMinutes =
      entry.actualStartTime && entry.actualEndTime
        ? Math.max(
            1,
            Math.ceil(
              (new Date(entry.actualEndTime).getTime() -
                new Date(entry.actualStartTime).getTime()) /
                60_000,
            ),
          )
        : null;
    parts.push(
      actualMinutes != null
        ? t('durationActualExpected', {
            actual: actualMinutes,
            expected: entry.expectedDurationMinutes,
          })
        : t('durationMinutes', { n: entry.expectedDurationMinutes }),
    );
  }
  return parts;
}

function ProgramEntryRow({
  entry,
  index,
  showTeacher,
  showClass,
  actions,
  t,
}: {
  entry: ProgramEntry;
  index: number;
  showTeacher: boolean;
  showClass: boolean;
  actions?: React.ReactNode;
  t: ReturnType<typeof useTranslations>;
}) {
  const isRecitation = entry.kind === 'recitation';
  const dotColor = statusColor(entry.status) ?? entry.category?.color ?? null;
  const meta = metaParts(entry, showTeacher, showClass, t);

  return (
    <div className="flex items-start gap-2">
      {index > 0 && (
        <bdi className="text-muted-foreground mt-0.5 w-4 shrink-0 text-center text-xs font-medium">
          {index}
        </bdi>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        {/* Name + status */}
        <div className="flex items-center gap-1.5">
          {isRecitation ? (
            <BookMarked className="text-primary size-4 shrink-0" />
          ) : (
            <BookOpen className="text-muted-foreground size-4 shrink-0" />
          )}
          <span className="min-w-0 truncate text-sm font-semibold">
            {isRecitation ? t('recitation') : entry.name}
          </span>
          {dotColor && (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: dotColor }}
              title={t(`status_${entry.status}`)}
            />
          )}
          <span className="text-muted-foreground shrink-0 text-[11px]">
            {t(`status_${entry.status}`)}
          </span>
        </div>

        {/* Everything else, one muted line */}
        {meta.length > 0 && (
          <p className="text-muted-foreground truncate text-[11px]">
            <bdi>{meta.join(' · ')}</bdi>
          </p>
        )}

        {/* Description */}
        {!isRecitation && entry.description && (
          <p className="text-muted-foreground truncate text-xs">{entry.description}</p>
        )}

        {/* Actions */}
        {actions && <div className="mt-0.5 flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
    </div>
  );
}
