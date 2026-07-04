'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { InstituteLesson } from '@/lib/types';
import { deleteLesson } from '@/lib/api';
import { useInstituteLessons, useLessonCategories, useQueryClient, qk } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSkeleton } from '@/features/shared/skeletons';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { toYMD } from '@/features/attendance/calendar-utils';
import { AddLessonDialog, type LessonEditing } from './add-lesson-dialog';
import { CategoryManager } from './category-manager';
import { tint } from './lesson-colors';

const TODAY_YMD = toYMD(new Date());

function weekStart(d: Date): Date {
  const back = (d.getDay() - 6 + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
}

/**
 * Manager hub (spec 008): institute-wide lessons program.
 * Two views: "Program" (chronological list grouped by month, default) and
 * "Week" (7-day navigator for quick editing). Today is always highlighted.
 */
export function InstituteLessonsHub({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const locale = useLocale();
  const qc = useQueryClient();
  const { data, isLoading } = useInstituteLessons(instituteId);
  const { data: categories = [] } = useLessonCategories(instituteId);

  const [viewMode, setViewMode] = useState<'program' | 'week'>('program');
  const [cursor, setCursor] = useState(() => weekStart(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonEditing | null>(null);
  const [presetDate, setPresetDate] = useState<string>();

  const refresh = () => qc.invalidateQueries({ queryKey: qk.instituteLessons(instituteId) });

  // Program view: sort all entries by date, group by month then day
  const programMonths = useMemo(() => {
    if (!data?.entries) return [];
    const sorted = [...data.entries].sort((a, b) => a.date.localeCompare(b.date));
    const byDate = new Map<string, InstituteLesson[]>();
    for (const e of sorted) {
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date)!.push(e);
    }
    const byMonth = new Map<string, { ymd: string; entries: InstituteLesson[] }[]>();
    for (const [ymd, entries] of byDate) {
      const monthKey = ymd.slice(0, 7);
      if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
      byMonth.get(monthKey)!.push({ ymd, entries });
    }
    return [...byMonth.entries()].map(([month, days]) => ({ month, days }));
  }, [data?.entries]);

  // Week view: current 7-day window with entries injected
  const weekDays = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      return { date: d, ymd: toYMD(d), entries: [] as InstituteLesson[] };
    });
    const byYmd = new Map(days.map((d) => [d.ymd, d]));
    for (const e of data?.entries ?? []) byYmd.get(e.date)?.entries.push(e);
    return days;
  }, [cursor, data?.entries]);

  if (isLoading || !data) return <ListSkeleton />;

  const Prev = locale === 'ar' ? ChevronRight : ChevronLeft;
  const Next = locale === 'ar' ? ChevronLeft : ChevronRight;
  const shiftWeek = (n: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() + n * 7));

  const openCreate = (ymd?: string) => {
    setEditing(null);
    setPresetDate(ymd);
    setDialogOpen(true);
  };
  const openEdit = (e: InstituteLesson) => {
    setEditing({
      lessonId: e.lessonId,
      kind: e.kind,
      name: e.name,
      description: e.description,
      categoryId: e.category?.id ?? null,
      date: e.date,
      sources: e.sources.map((s) => ({
        kind: s.kind,
        url: s.url,
        description: s.description ?? undefined,
      })),
    });
    setPresetDate(undefined);
    setDialogOpen(true);
  };
  const handleDelete = async (lessonId: string) => {
    await deleteLesson(lessonId);
    refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t('hubTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('hubSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryManager instituteId={instituteId} />
          <Button size="sm" onClick={() => openCreate()}>
            <Plus data-icon="inline-start" />
            {t('addLesson')}
          </Button>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-1 self-start rounded-lg border p-1">
        <Button
          variant={viewMode === 'program' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() => setViewMode('program')}
        >
          <LayoutList className="size-3.5" />
          {t('programView')}
        </Button>
        <Button
          variant={viewMode === 'week' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={() => setViewMode('week')}
        >
          <CalendarDays className="size-3.5" />
          {t('weekView')}
        </Button>
      </div>

      {/* ── PROGRAM VIEW ── */}
      {viewMode === 'program' && (
        programMonths.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-12 text-center">
              {t('noLessons')}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            {programMonths.map(({ month, days }) => (
              <ProgramMonthSection
                key={month}
                month={month}
                days={days}
                locale={locale}
                onEdit={openEdit}
                onAdd={(ymd) => openCreate(ymd)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}

      {/* ── WEEK VIEW ── */}
      {viewMode === 'week' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shiftWeek(-1)} aria-label={t('week')}>
              <Prev className="size-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold">
              {cursor.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} –{' '}
              {weekDays[6].date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => shiftWeek(1)} aria-label={t('week')}>
              <Next className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {weekDays.map((d) => (
              <WeekDaySection
                key={d.ymd}
                ymd={d.ymd}
                date={d.date}
                entries={d.entries}
                locale={locale}
                isToday={d.ymd === TODAY_YMD}
                onEdit={openEdit}
                onAdd={() => openCreate(d.ymd)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <AddLessonDialog
        instituteId={instituteId}
        categories={categories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={refresh}
        preselectDate={presetDate}
        editing={editing}
      />
    </div>
  );
}

// ── Program Month Section ────────────────────────────────────────────────────

function ProgramMonthSection({
  month,
  days,
  locale,
  onEdit,
  onAdd,
  onDelete,
}: {
  month: string;
  days: { ymd: string; entries: InstituteLesson[] }[];
  locale: string;
  onEdit: (e: InstituteLesson) => void;
  onAdd: (ymd: string) => void;
  onDelete: (lessonId: string) => Promise<void>;
}) {
  // Use day 15 to avoid timezone-related month drift when constructing Date
  const monthLabel = new Date(month + '-15').toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Month header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-bold shrink-0">
          {monthLabel}
        </div>
        <div className="bg-border h-px flex-1" />
      </div>

      {/* Day rows */}
      <div className="flex flex-col gap-1.5">
        {days.map(({ ymd, entries }) => (
          <ProgramDayRow
            key={ymd}
            ymd={ymd}
            entries={entries}
            locale={locale}
            isToday={ymd === TODAY_YMD}
            onEdit={onEdit}
            onAdd={onAdd}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ── Program Day Row ──────────────────────────────────────────────────────────

function ProgramDayRow({
  ymd,
  entries,
  locale,
  isToday,
  onEdit,
  onAdd,
  onDelete,
}: {
  ymd: string;
  entries: InstituteLesson[];
  locale: string;
  isToday: boolean;
  onEdit: (e: InstituteLesson) => void;
  onAdd: (ymd: string) => void;
  onDelete: (lessonId: string) => Promise<void>;
}) {
  const t = useTranslations('lessons');
  const dateObj = new Date(ymd + 'T12:00:00');
  const dayNum = dateObj.getDate();
  const dayName = dateObj.toLocaleDateString(locale, { weekday: 'long' });

  return (
    <div
      className={`group flex gap-3 rounded-xl border p-3 transition ${
        isToday
          ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card hover:bg-muted/20'
      }`}
    >
      {/* Date badge */}
      <div
        className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-lg px-1 py-2 ${
          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <span className="text-xl font-bold leading-tight">{dayNum}</span>
        <span className="text-[10px] font-medium leading-tight opacity-75">{dayName}</span>
      </div>

      {/* Lessons stacked */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {entries.map((e, idx) => (
          <HubLessonRow
            key={e.lessonId}
            entry={e}
            index={entries.length > 1 ? idx + 1 : 0}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e.lessonId)}
          />
        ))}
      </div>

      {/* Add on hover */}
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 self-start opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onAdd(ymd)}
        aria-label={t('addLesson')}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

// ── Week Day Section ─────────────────────────────────────────────────────────

function WeekDaySection({
  ymd,
  date,
  entries,
  locale,
  isToday,
  onEdit,
  onAdd,
  onDelete,
}: {
  ymd: string;
  date: Date;
  entries: InstituteLesson[];
  locale: string;
  isToday: boolean;
  onEdit: (e: InstituteLesson) => void;
  onAdd: () => void;
  onDelete: (lessonId: string) => Promise<void>;
}) {
  const t = useTranslations('lessons');
  const hasLessons = entries.length > 0;

  return (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        isToday ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border'
      } ${!hasLessons ? 'opacity-50' : ''}`}
    >
      {/* Day header */}
      <div
        className={`flex items-center justify-between px-3 py-2 ${
          isToday ? 'bg-primary/10' : hasLessons ? 'bg-muted/30' : ''
        } ${hasLessons ? 'border-b border-border' : ''}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex size-7 items-center justify-center rounded-full text-sm font-bold ${
              isToday ? 'bg-primary text-primary-foreground' : ''
            }`}
          >
            {date.getDate()}
          </span>
          <span className="text-sm font-medium">
            {date.toLocaleDateString(locale, { weekday: 'long', month: 'short' })}
          </span>
          {isToday && (
            <span className="text-primary text-xs font-semibold">{t('today')}</span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onAdd}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Entries */}
      {hasLessons && (
        <div className="flex flex-col gap-2 p-3">
          {entries.map((e, idx) => (
            <HubLessonRow
              key={e.lessonId}
              entry={e}
              index={entries.length > 1 ? idx + 1 : 0}
              onEdit={() => onEdit(e)}
              onDelete={() => onDelete(e.lessonId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hub Lesson Row ───────────────────────────────────────────────────────────

function HubLessonRow({
  entry,
  index,
  onEdit,
  onDelete,
}: {
  entry: InstituteLesson;
  index: number;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations('lessons');
  const isRecitation = entry.kind === 'recitation';
  const color = entry.category?.color;

  return (
    <div className="flex items-start gap-2">
      {/* Lesson number (when multiple per day) */}
      {index > 0 && (
        <span className="text-muted-foreground mt-0.5 w-4 shrink-0 text-xs font-medium">
          {index}.
        </span>
      )}

      {/* Category color strip */}
      {color && (
        <div
          className="mt-1 w-1 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: color, minHeight: 16 }}
        />
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {isRecitation ? (
            <BookMarked className="text-primary size-3.5 shrink-0" />
          ) : (
            <BookOpen className="text-muted-foreground size-3.5 shrink-0" />
          )}
          <span className="text-sm font-medium">
            {isRecitation ? t('recitation') : entry.name}
          </span>
          {entry.category && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: tint(entry.category.color, 0.18),
                color: entry.category.color,
              }}
            >
              {entry.category.name}
            </span>
          )}
        </div>

        {/* Classes + teachers */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {entry.classes.map((c) => (
            <span key={c.lessonClassId} className="text-muted-foreground text-[11px]">
              {c.className}
              <span className="opacity-60"> · {c.teacher.name}</span>
            </span>
          ))}
        </div>
      </div>

      <HubMenu onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

// ── Hub Menu ─────────────────────────────────────────────────────────────────

function HubMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => Promise<void> }) {
  const t = useTranslations('lessons');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6 shrink-0">
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" />
          {t('editLesson')}
        </DropdownMenuItem>
        <ConfirmDialog
          title={t('deleteLesson')}
          message={t('deleteLessonMsg')}
          onConfirm={onDelete}
          trigger={
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 className="size-4" />
              {t('deleteLesson')}
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
