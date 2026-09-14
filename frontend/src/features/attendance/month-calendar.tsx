'use client';

import { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildMonthGrid,
  weekdayHeaders,
  type CalendarCell,
} from './calendar-utils';

/**
 * Generic month grid (Saturday-first, Arabic week). Manages its own month
 * navigation and delegates each day's content to `renderDay`. Non-month days
 * render dimmed and empty. RTL-aware via logical chevrons.
 */
import { formatDateLocale } from '@/lib/utils';

export function MonthCalendar({
  month: currentMonth,
  onMonthChange,
  lessons = new Set(),
  renderDay,
}: {
  month?: Date;
  onMonthChange?: (month: Date) => void;
  lessons?: Set<number>;
  renderDay: (cell: CalendarCell) => React.ReactNode;
}) {
  const locale = useLocale();
  const [internalMonth, setInternalMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const isControlled = currentMonth !== undefined;
  const month = isControlled ? currentMonth : internalMonth;
  const setMonth = (fn: (prev: Date) => Date) => {
    const next = fn(month);
    if (!isControlled) setInternalMonth(next);
    onMonthChange?.(next);
  };

  const weeks = useMemo(() => buildMonthGrid(month, lessons), [month, lessons]);
  const headers = useMemo(() => weekdayHeaders(locale), [locale]);

  const Prev = locale === 'ar' ? ChevronRight : ChevronLeft;
  const Next = locale === 'ar' ? ChevronLeft : ChevronRight;

  const shift = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="flex flex-col gap-2">
      {/* Header: month label + nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="prev">
          <Prev className="size-4" />
        </Button>
        <span className="text-sm font-semibold">
          {month.toLocaleDateString(formatDateLocale(locale), { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="next">
          <Next className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {headers.map((h, i) => (
          <span key={i} className="text-muted-foreground text-[11px] font-medium">
            {h}
          </span>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <div
                key={cell.ymd}
                className={cn(
                  'relative min-h-14 overflow-hidden rounded-lg border p-0.5 text-center transition-colors sm:min-h-16',
                  !cell.inMonth && 'border-transparent opacity-30',
                  // Lesson days are tinted so the class's days pop immediately.
                  cell.inMonth && cell.isLessonDay && 'border-primary/40 bg-primary/10',
                  cell.inMonth && !cell.isLessonDay && 'border-border',
                  cell.isToday && 'ring-primary ring-2 ring-offset-1',
                )}
              >
                {cell.inMonth ? renderDay(cell) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
