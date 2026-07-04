'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import {
  deleteLesson,
  removeLessonClass,
  setClassLessonsVisibility,
} from '@/lib/api';
import { useClassLessons, useLessonCategories, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSkeleton } from '@/features/shared/skeletons';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { toYMD } from '@/features/attendance/calendar-utils';
import { LessonCard } from './lesson-card';

const TODAY_YMD = toYMD(new Date());
import { AddLessonDialog, type LessonEditing } from './add-lesson-dialog';
import { CategoryManager } from './category-manager';

/** Saturday-of-the-week for a date (Arabic week starts Saturday). */
function weekStart(d: Date): Date {
  const back = (d.getDay() - 6 + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
}

/**
 * Class Lessons tab (spec 008): a week navigator with entries grouped by day.
 * Managers can add/edit/delete lessons, reorder within a day, manage categories,
 * and toggle student visibility. Teachers see it read-only.
 */
export function LessonProgram({
  classId,
  instituteId,
  canManage,
}: {
  classId: string;
  instituteId: string;
  canManage: boolean;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const locale = useLocale();
  const qc = useQueryClient();
  const { data, isLoading } = useClassLessons(classId);
  const { data: categories = [] } = useLessonCategories(instituteId);

  const [cursor, setCursor] = useState(() => weekStart(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonEditing | null>(null);
  const [presetDate, setPresetDate] = useState<string>();

  const refresh = () => qc.invalidateQueries({ queryKey: qk.classLessons(classId) });
  const refreshAll = () => {
    refresh();
    qc.invalidateQueries({ queryKey: qk.classProfile(classId) });
  };

  // Group the week's entries by day.
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      return { date: d, ymd: toYMD(d), entries: [] as ProgramEntry[] };
    });
    const byYmd = new Map(days.map((d) => [d.ymd, d]));
    for (const e of data?.entries ?? []) byYmd.get(e.date)?.entries.push(e);
    for (const d of days) d.entries.sort((a, b) => a.sort - b.sort);
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
  const openEdit = (e: ProgramEntry) => {
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

  async function toggleVisibility() {
    try {
      await setClassLessonsVisibility(classId, !data!.lessonsVisibleToStudents);
      refreshAll();
    } catch (err) {
      notify.error(err, tc('error'));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shiftWeek(-1)} aria-label={t('week')}>
            <Prev className="size-4" />
          </Button>
          <span className="text-sm font-semibold">
            {cursor.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} –{' '}
            {week[6].date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => shiftWeek(1)} aria-label={t('week')}>
            <Next className="size-4" />
          </Button>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <CategoryManager instituteId={instituteId} />
            <Button size="sm" onClick={() => openCreate()}>
              <Plus data-icon="inline-start" />
              {t('addLesson')}
            </Button>
          </div>
        )}
      </div>

      {/* Student visibility toggle (manager) */}
      {canManage && (
        <button
          type="button"
          onClick={toggleVisibility}
          className="border-border hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition"
        >
          <span className="flex flex-col">
            <span className="text-sm font-medium">{t('studentVisibility')}</span>
            <span className="text-muted-foreground text-xs">{t('studentVisibilityHint')}</span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${data.lessonsVisibleToStudents ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${data.lessonsVisibleToStudents ? 'start-[1.375rem]' : 'start-0.5'}`}
            />
          </span>
        </button>
      )}

      {/* Days — empty days are shown dimmed for managers, hidden for others */}
      <div className="flex flex-col gap-2">
        {week.map((d) => {
          const isToday = d.ymd === TODAY_YMD;
          const hasLessons = d.entries.length > 0;
          if (!hasLessons && !canManage) return null;
          return (
            <div
              key={d.ymd}
              className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2 transition ${
                isToday
                  ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card'
              } ${!hasLessons ? 'opacity-40' : ''}`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-sm font-bold ${
                      isToday ? 'bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    {d.date.getDate()}
                  </span>
                  <span className="text-sm font-semibold">
                    {d.date.toLocaleDateString(locale, { weekday: 'long', month: 'short' })}
                  </span>
                  {isToday && (
                    <span className="text-primary text-xs font-semibold">{t('today')}</span>
                  )}
                </div>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => openCreate(d.ymd)}>
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>

              {/* Lesson cards */}
              {hasLessons && (
                <div className="flex flex-col gap-1.5 pt-0.5">
                  {d.entries.map((e, idx) => (
                    <LessonCard
                      key={e.lessonClassId}
                      entry={e}
                      index={d.entries.length > 1 ? idx + 1 : 0}
                      showTeacher
                      actions={
                        canManage ? (
                          <EntryMenu
                            onEdit={() => openEdit(e)}
                            onRemoveFromClass={async () => {
                              await removeLessonClass(e.lessonClassId);
                              refresh();
                            }}
                            onDelete={async () => {
                              await deleteLesson(e.lessonId);
                              refresh();
                            }}
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canManage && (
        <AddLessonDialog
          instituteId={instituteId}
          categories={categories}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onDone={refresh}
          preselectClassId={classId}
          preselectDate={presetDate}
          editing={editing}
        />
      )}
    </div>
  );
}

function EntryMenu({
  onEdit,
  onRemoveFromClass,
  onDelete,
}: {
  onEdit: () => void;
  onRemoveFromClass: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={tc('save')}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" />
          {t('editLesson')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onRemoveFromClass()}>
          {t('removeFromClass')}
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
