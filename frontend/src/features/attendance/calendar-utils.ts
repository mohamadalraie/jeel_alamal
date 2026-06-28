import type { Weekday, ScheduleSlot } from '@/lib/types';

/** Our schedule weekday keys → JS Date.getDay() (0=Sun … 6=Sat). */
export const WEEKDAY_TO_JS: Record<Weekday, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/** The set of JS weekday numbers the class meets on, from its schedule. */
export function lessonJsDays(schedule: Pick<ScheduleSlot, 'dayOfWeek'>[]): Set<number> {
  return new Set(schedule.map((s) => WEEKDAY_TO_JS[s.dayOfWeek]));
}

/** Local 'YYYY-MM-DD' (no timezone shift — attendance dates are plain dates). */
export function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface CalendarCell {
  date: Date;
  ymd: string;
  inMonth: boolean;
  isLessonDay: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * A 6×7 month matrix, Saturday-first (Arabic week order). Includes leading and
 * trailing days from adjacent months so every row is full; those are flagged
 * `inMonth: false`.
 */
export function buildMonthGrid(month: Date, lessons: Set<number>): CalendarCell[][] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  // Walk back to the Saturday on/before the 1st.
  const back = (first.getDay() - 6 + 7) % 7;
  const start = new Date(year, m, 1 - back);

  const todayYMD = toYMD(new Date());
  const weeks: CalendarCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor);
      const ymd = toYMD(date);
      row.push({
        date,
        ymd,
        inMonth: date.getMonth() === m,
        isLessonDay: lessons.has(date.getDay()),
        isToday: ymd === todayYMD,
        isFuture: ymd > todayYMD,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

/** Localised weekday headers in Saturday-first order. */
export function weekdayHeaders(locale: string): string[] {
  // 2023-01-07 is a Saturday; step seven days for short names.
  const base = new Date(2023, 0, 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.toLocaleDateString(locale, { weekday: 'short' });
  });
}
