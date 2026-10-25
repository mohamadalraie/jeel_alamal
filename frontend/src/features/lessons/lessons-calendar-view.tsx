'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  BookOpen,
  BookMarked,
  User,
  School,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { formatTeacherName, formatDateLocale } from '@/lib/utils';
import { toYMD, weekdayHeaders } from '@/features/attendance/calendar-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LessonStatusBadge, statusColor } from './lesson-status-badge';
import { LessonDetailsDialog } from './lesson-details-dialog';

export interface CalendarViewProps {
  entries: ProgramEntry[];
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
  onAddDay?: (ymd: string) => void;
}

export function LessonsCalendarView({
  entries,
  renderActions,
  onAddDay,
}: CalendarViewProps) {
  const t = useTranslations('lessons');
  const locale = useLocale();
  const dateLoc = formatDateLocale(locale);

  // Current viewed month (1st of that month)
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const todayYMD = toYMD(new Date());
  const [selectedYMD, setSelectedYMD] = useState<string>(todayYMD);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, ProgramEntry[]>();
    for (const e of entries) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [entries]);

  // Build Saturday-first calendar matrix
  const { weeks, monthTitle } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0=Sun ... 6=Sat
    // Offset to previous Saturday
    const backToSat = (dayOfWeek - 6 + 7) % 7;
    const start = new Date(year, month, 1 - backToSat);

    const resultWeeks: {
      date: Date;
      ymd: string;
      inCurrentMonth: boolean;
      isToday: boolean;
      entries: ProgramEntry[];
    }[][] = [];

    const cursor = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const ymd = toYMD(cursor);
        row.push({
          date: new Date(cursor),
          ymd,
          inCurrentMonth: cursor.getMonth() === month,
          isToday: ymd === todayYMD,
          entries: entriesByDate.get(ymd) ?? [],
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      resultWeeks.push(row);
      // If next week's first day is not in current month, stop early (to avoid extra empty rows)
      if (cursor.getMonth() !== month && w >= 3) {
        break;
      }
    }

    const title = currentMonth.toLocaleDateString(dateLoc, {
      month: 'long',
      year: 'numeric',
    });

    return { weeks: resultWeeks, monthTitle: title };
  }, [currentMonth, entriesByDate, todayYMD, dateLoc]);

  const headers = useMemo(() => weekdayHeaders(locale), [locale]);

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedYMD(todayYMD);
  };

  const selectedEntries = entriesByDate.get(selectedYMD) ?? [];
  const selectedDateObj = new Date(selectedYMD + 'T12:00:00');
  const selectedDateLabel = selectedDateObj.toLocaleDateString(dateLoc, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const PrevIcon = locale === 'ar' ? ChevronRight : ChevronLeft;
  const NextIcon = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-5">
      {/* Month Navigation & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/60 p-3.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={prevMonth}
            aria-label="الشهر السابق"
          >
            <PrevIcon className="size-4" />
          </Button>

          <span className="min-w-36 text-center text-base font-bold tracking-tight">
            {monthTitle}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={nextMonth}
            aria-label="الشهر القادم"
          >
            <NextIcon className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            اليوم
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>مكتمل</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-blue-500" />
            <span>جارٍ</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>في الانتظار</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500" />
            <span>لم يُعطَ</span>
          </div>
        </div>
      </div>

      {/* Main Grid + Inspector */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Calendar Grid (2 cols on large screen) */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm lg:col-span-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
            {headers.map((h, i) => (
              <div key={i} className="py-2.5">
                {h}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
            {weeks.flatMap((row, wi) =>
              row.map((cell, di) => {
                const isSelected = cell.ymd === selectedYMD;
                const hasLessons = cell.entries.length > 0;

                // Status dots count
                let completedCount = 0;
                let startedCount = 0;
                let pendingCount = 0;
                let missedCount = 0;

                for (const e of cell.entries) {
                  if (
                    e.status === 'finished' ||
                    e.status === 'over_time' ||
                    e.status === 'under_time'
                  ) {
                    completedCount++;
                  } else if (e.status === 'started') {
                    startedCount++;
                  } else if (e.status === 'not_given') {
                    missedCount++;
                  } else {
                    pendingCount++;
                  }
                }

                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => setSelectedYMD(cell.ymd)}
                    className={`group relative flex min-h-[78px] flex-col justify-between p-1.5 text-start transition-colors sm:min-h-[92px] sm:p-2 ${
                      !cell.inCurrentMonth
                        ? 'bg-muted/10 opacity-40 hover:opacity-80'
                        : isSelected
                        ? 'bg-primary/10 ring-2 ring-primary inset-0 z-10'
                        : cell.isToday
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    {/* Top Row: Date Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                          cell.isToday
                            ? 'bg-primary text-primary-foreground font-bold'
                            : isSelected
                            ? 'text-primary font-bold'
                            : 'text-foreground/80'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {hasLessons && (
                        <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline-block">
                          {cell.entries.length} درس
                        </span>
                      )}
                    </div>

                    {/* Middle/Bottom: Lesson dots or pills */}
                    {hasLessons ? (
                      <div className="mt-1 flex flex-col gap-1">
                        {/* Dots on mobile, pills on desktop */}
                        <div className="flex items-center gap-1 sm:hidden">
                          {completedCount > 0 && (
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                          )}
                          {startedCount > 0 && (
                            <span className="size-1.5 rounded-full bg-blue-500" />
                          )}
                          {pendingCount > 0 && (
                            <span className="size-1.5 rounded-full bg-amber-500" />
                          )}
                          {missedCount > 0 && (
                            <span className="size-1.5 rounded-full bg-rose-500" />
                          )}
                        </div>

                        <div className="hidden flex-col gap-0.5 sm:flex">
                          {cell.entries.slice(0, 2).map((e) => (
                            <div
                              key={e.lessonClassId}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium truncate bg-muted/60"
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    statusColor(e.status) ?? '#94A3B8',
                                }}
                              />
                              <span className="truncate">{e.name || t('recitation')}</span>
                            </div>
                          ))}
                          {cell.entries.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-medium px-1">
                              +{cell.entries.length - 2} المزيد
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium">دروس اليوم المحدد:</span>
              <span className="text-sm font-bold">{selectedDateLabel}</span>
            </div>
            {onAddDay && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddDay(selectedYMD)}
                className="h-8 gap-1 text-xs"
              >
                <Plus className="size-3.5" />
                إضافة درس
              </Button>
            )}
          </div>

          {selectedEntries.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <CalendarIcon className="size-8 opacity-40" />
              <p className="text-xs">لا توجد دروس مسجلة في هذا اليوم</p>
              {onAddDay && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAddDay(selectedYMD)}
                  className="mt-1 h-7 text-xs text-primary"
                >
                  <Plus className="size-3 ml-1" />
                  جدولة درس جديد
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 divide-y divide-border/50 max-h-[500px] overflow-y-auto pr-1">
              {selectedEntries.map((e) => (
                <DayLessonItem
                  key={e.lessonClassId}
                  entry={e}
                  renderActions={renderActions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayLessonItem({
  entry,
  renderActions,
}: {
  entry: ProgramEntry;
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
}) {
  const t = useTranslations('lessons');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isRecitation = entry.kind === 'recitation';

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className="group flex flex-col gap-1.5 pt-2.5 first:pt-0 cursor-pointer rounded-lg p-2 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isRecitation ? (
              <BookMarked className="size-4 shrink-0 text-primary" />
            ) : (
              <BookOpen className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-semibold text-xs sm:text-sm truncate group-hover:text-primary transition-colors">
              {isRecitation ? t('recitation') : entry.name}
            </span>
          </div>

          <LessonStatusBadge status={entry.status} className="text-[10px] shrink-0" />
        </div>

        {/* Sub details */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <School className="size-3 text-muted-foreground/70" />
            <span>{entry.className}</span>
          </div>

          <div className="flex items-center gap-1">
            <User className="size-3 text-muted-foreground/70" />
            <span>{formatTeacherName(entry.teacher.name)}</span>
          </div>

          {entry.category && (
            <div className="flex items-center gap-1">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: entry.category.color }}
              />
              <span>{entry.category.name}</span>
            </div>
          )}

          {entry.expectedDurationMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground/70" />
              <span>{entry.expectedDurationMinutes} دقيقة</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {renderActions && (
          <div
            className="mt-1 flex items-center justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {renderActions(entry)}
          </div>
        )}
      </div>

      <LessonDetailsDialog
        entry={entry}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        actions={renderActions?.(entry)}
      />
    </>
  );
}
