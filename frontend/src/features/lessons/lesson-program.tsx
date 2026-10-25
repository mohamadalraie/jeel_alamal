'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarDays,
  CalendarRange,
  MoreVertical,
  Pencil,
  Plus,
  School,
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
import { useInstitute } from '@/features/layout/institute-context';
import { LessonTimerActions } from './lesson-timer-actions';
import { AddLessonDialog, type LessonEditing } from './add-lesson-dialog';
import { CategoryManager } from './category-manager';
import { SubjectManager } from './subject-manager';
import { LessonsSummaryCards } from './lessons-summary-cards';
import { LessonsCalendarView } from './lessons-calendar-view';
import { LessonsByClassView } from './lessons-by-class-view';
import { WeeklyPlanView } from '@/features/classes/weekly-plan';

type ClassViewMode = 'calendar' | 'by_class' | 'weekly_plan';

/**
 * Class Lessons tab (spec 008/009 / Advanced view):
 * Provides the 3 clean views: Calendar, By Class / List, and Weekly Plan,
 * alongside KPI summary cards.
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
  const qc = useQueryClient();
  const { user } = useInstitute();
  const { data, isLoading } = useClassLessons(classId);
  const { data: categories = [] } = useLessonCategories(instituteId);

  const [viewMode, setViewMode] = useState<ClassViewMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonEditing | null>(null);
  const [presetDate, setPresetDate] = useState<string>();

  const refresh = () => qc.invalidateQueries({ queryKey: qk.classLessons(classId) });
  const refreshAll = () => {
    refresh();
    qc.invalidateQueries({ queryKey: qk.classProfile(classId) });
  };

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
      expectedDurationMinutes: e.expectedDurationMinutes,
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

  // Filter entries by status if selected in KPI cards
  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (!statusFilter) return data.entries;

    if (statusFilter === 'completed') {
      return data.entries.filter(
        (e) =>
          e.status === 'finished' ||
          e.status === 'over_time' ||
          e.status === 'under_time'
      );
    }
    if (statusFilter === 'started') {
      return data.entries.filter((e) => e.status === 'started');
    }
    if (statusFilter === 'not_given') {
      return data.entries.filter((e) => e.status === 'not_given');
    }
    if (statusFilter === 'pending') {
      return data.entries.filter((e) => e.status === 'pending');
    }
    return data.entries;
  }, [data?.entries, statusFilter]);

  const uniqueTeachers = useMemo(() => {
    if (!data?.entries) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const e of data.entries) {
      if (e.teacher?.id) map.set(e.teacher.id, e.teacher);
    }
    return Array.from(map.values());
  }, [data?.entries]);

  if (isLoading || !data) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar (manager) ── */}
      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Student visibility toggle */}
          <button
            type="button"
            onClick={toggleVisibility}
            className="border-border hover:bg-muted/50 flex items-center justify-between gap-2.5 rounded-xl border px-3 py-1.5 text-start transition"
          >
            <span className="flex flex-col">
              <span className="text-xs font-semibold">{t('studentVisibility')}</span>
              <span className="text-muted-foreground text-[10px]">{t('studentVisibilityHint')}</span>
            </span>
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                data.lessonsVisibleToStudents ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                  data.lessonsVisibleToStudents ? 'start-[1.125rem]' : 'start-0.5'
                }`}
              />
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <CategoryManager instituteId={instituteId} />
            <SubjectManager instituteId={instituteId} />
            <Button size="sm" onClick={() => openCreate()}>
              <Plus data-icon="inline-start" className="size-4" />
              {t('addLesson')}
            </Button>
          </div>
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      {viewMode !== 'weekly_plan' && (
        <LessonsSummaryCards
          entries={data.entries}
          activeStatusFilter={statusFilter}
          onSelectStatus={setStatusFilter}
        />
      )}

      {/* ── View Switcher Buttons ── */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/70 p-1">
          <Button
            type="button"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
          >
            <CalendarDays className="size-3.5" />
            <span>التقويم الشهري</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === 'by_class' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('by_class')}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
          >
            <School className="size-3.5" />
            <span>استعراض الدروس</span>
          </Button>
          <Button
            type="button"
            variant={viewMode === 'weekly_plan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('weekly_plan')}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
          >
            <CalendarRange className="size-3.5" />
            <span>الخطة الأسبوعية</span>
          </Button>
        </div>
      </div>

      {/* ── View Mode: Calendar ── */}
      {viewMode === 'calendar' && (
        <LessonsCalendarView
          entries={filteredEntries}
          onAddDay={canManage ? (ymd) => openCreate(ymd) : undefined}
          renderActions={(e) => {
            const canStart = user.id === e.teacher.id;
            if (!canStart && !canManage) return null;
            return (
              <div className="flex items-center gap-1.5">
                {canStart && <LessonTimerActions entry={e} />}
                {canManage && (
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
                )}
              </div>
            );
          }}
        />
      )}

      {/* ── View Mode: By Class ── */}
      {viewMode === 'by_class' && (
        <LessonsByClassView
          entries={filteredEntries}
          onAddLessonForClass={canManage ? () => openCreate() : undefined}
          renderActions={(e) => {
            const canStart = user.id === e.teacher.id;
            if (!canStart && !canManage) return null;
            return (
              <div className="flex items-center gap-1.5">
                {canStart && <LessonTimerActions entry={e} />}
                {canManage && (
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
                )}
              </div>
            );
          }}
        />
      )}

      {/* ── View Mode: Weekly Plan ── */}
      {viewMode === 'weekly_plan' && (
        <WeeklyPlanView
          classId={classId}
          instituteId={instituteId}
          canManage={canManage}
          teachers={uniqueTeachers}
        />
      )}

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
