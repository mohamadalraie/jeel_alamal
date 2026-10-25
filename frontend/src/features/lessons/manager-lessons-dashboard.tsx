'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  CalendarDays,
  LayoutList,
  MoreVertical,
  Pencil,
  Plus,
  School,
  Settings,
  Trash2,
  CalendarRange,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { InstituteLesson, ProgramEntry } from '@/lib/types';
import { deleteLesson, removeLessonClass } from '@/lib/api';
import {
  useInstituteLessons,
  useLessonCategories,
  useClasses,
  useTeachers,
  useQueryClient,
  qk,
} from '@/lib/queries';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSkeleton } from '@/features/shared/skeletons';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { LessonProgramList } from './lesson-program-list';
import { AddLessonDialog, type LessonEditing } from './add-lesson-dialog';
import { CategoryManager } from './category-manager';
import { SubjectManager } from './subject-manager';
import { InstituteWeeklyPlan } from './institute-weekly-plan';
import { LessonsSummaryCards } from './lessons-summary-cards';
import { LessonsFilterBar, type FilterState } from './lessons-filter-bar';
import { LessonsCalendarView } from './lessons-calendar-view';
import { LessonsByClassView } from './lessons-by-class-view';

type ViewMode = 'list' | 'calendar' | 'by_class' | 'weekly_plan';

/**
 * Convert backend InstituteLesson[] to flat ProgramEntry[]
 */
function toEntries(lessons: InstituteLesson[]): ProgramEntry[] {
  const result: ProgramEntry[] = [];
  lessons.forEach((lesson, li) => {
    lesson.classes.forEach((cls, ci) => {
      result.push({
        lessonClassId: cls.lessonClassId,
        lessonId: lesson.lessonId,
        kind: lesson.kind,
        name: lesson.name,
        subjectId: lesson.subjectId,
        subjectName: lesson.subjectName,
        description: lesson.description,
        category: lesson.category,
        date: lesson.date,
        sort: li * 100 + ci,
        expectedDurationMinutes: lesson.expectedDurationMinutes,
        status: cls.status,
        actualStartTime: cls.actualStartTime,
        actualEndTime: cls.actualEndTime,
        teacher: cls.teacher,
        className: cls.className,
        classId: cls.classId,
        sources: lesson.sources,
      });
    });
  });
  return result;
}

export function ManagerLessonsDashboard({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  // Initial date filter: Current Month
  const [filters, setFilters] = useState<FilterState>(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      preset: 'this_month',
      fromDate: first.toISOString().slice(0, 10),
      toDate: last.toISOString().slice(0, 10),
    };
  });

  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Queries
  const { data, isLoading } = useInstituteLessons(
    instituteId,
    filters.fromDate,
    filters.toDate
  );
  const { data: categories = [] } = useLessonCategories(instituteId);
  const { data: classes = [] } = useClasses(instituteId);
  const { data: teachers = [] } = useTeachers(instituteId);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LessonEditing | null>(null);
  const [presetDate, setPresetDate] = useState<string>();
  const [presetClassId, setPresetClassId] = useState<string>();

  const refresh = () =>
    qc.invalidateQueries({ queryKey: qk.instituteLessons(instituteId) });

  const openCreate = (ymd?: string, classId?: string) => {
    setEditing(null);
    setPresetDate(ymd);
    setPresetClassId(classId);
    setDialogOpen(true);
  };

  const openEdit = (e: ProgramEntry) => {
    const lesson = data?.entries.find((l) => l.lessonId === e.lessonId);
    if (!lesson) return;
    setEditing({
      lessonId: lesson.lessonId,
      kind: lesson.kind,
      name: lesson.name,
      subjectId: lesson.subjectId,
      subjectName: lesson.subjectName,
      description: lesson.description,
      categoryId: lesson.category?.id ?? null,
      date: lesson.date,
      expectedDurationMinutes: lesson.expectedDurationMinutes,
      sources: lesson.sources.map((s) => ({
        kind: s.kind,
        url: s.url,
        description: s.description ?? undefined,
      })),
    });
    setPresetDate(undefined);
    setPresetClassId(undefined);
    setDialogOpen(true);
  };

  // Convert raw lessons to flat program entries
  const allPeriodEntries = useMemo(() => {
    return toEntries(data?.entries ?? []);
  }, [data]);

  // Entries for summary cards (before status filtering, so status cards stay stable)
  const entriesForSummary = useMemo(() => {
    let result = allPeriodEntries;

    if (filters.classId) {
      result = result.filter(
        (e) => e.classId === filters.classId || e.className === filters.classId
      );
    }
    if (filters.teacherId) {
      result = result.filter((e) => e.teacher.id === filters.teacherId);
    }
    if (filters.categoryId) {
      result = result.filter((e) => e.category?.id === filters.categoryId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.teacher.name && e.teacher.name.toLowerCase().includes(q)) ||
          (e.className && e.className.toLowerCase().includes(q)) ||
          (e.category?.name && e.category.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allPeriodEntries, filters.classId, filters.teacherId, filters.categoryId, filters.search]);

  // Fully filtered entries (including status)
  const filteredEntries = useMemo(() => {
    let result = entriesForSummary;

    if (filters.status) {
      if (filters.status === 'completed') {
        result = result.filter(
          (e) =>
            e.status === 'finished' ||
            e.status === 'over_time' ||
            e.status === 'under_time'
        );
      } else if (filters.status === 'started') {
        result = result.filter((e) => e.status === 'started');
      } else if (filters.status === 'not_given') {
        result = result.filter((e) => e.status === 'not_given');
      } else if (filters.status === 'pending') {
        result = result.filter((e) => e.status === 'pending');
      }
    }

    return result;
  }, [entriesForSummary, filters.status]);

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إدارة واستعراض الدروس</h1>
          <p className="text-muted-foreground text-sm">
            لوحة تحكم شاملة لمتابعة سير الدروس، الخطة الأسبوعية، وتقارير الإنجاز لكافة الحلقات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CategoryManager instituteId={instituteId} />
          <SubjectManager instituteId={instituteId} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/lessons/settings">
              <Settings data-icon="inline-start" className="size-4" />
              {t('lessonSettings')}
            </Link>
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus data-icon="inline-start" className="size-4" />
            {t('addLesson')}
          </Button>
        </div>
      </div>

      {/* ── Summary KPI Cards ── */}
      {viewMode !== 'weekly_plan' && (
        <LessonsSummaryCards
          entries={entriesForSummary}
          activeStatusFilter={filters.status}
          onSelectStatus={(st) =>
            setFilters((prev) => ({ ...prev, status: st ?? undefined }))
          }
        />
      )}

      {/* ── View Switcher & Filter Bar ── */}
      <div className="flex flex-col gap-3">
        {/* View Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/70 p-1">
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
            >
              <LayoutList className="size-3.5" />
              <span>قائمة الدروس</span>
            </Button>
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
              <span>حسب الحلقة</span>
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

        {/* Filter Bar (Active on List, Calendar, and By Class views) */}
        {viewMode !== 'weekly_plan' && (
          <LessonsFilterBar
            filters={filters}
            onChange={setFilters}
            classes={classes}
            teachers={teachers}
            categories={categories}
            totalFilteredCount={filteredEntries.length}
            totalAllCount={allPeriodEntries.length}
          />
        )}
      </div>

      {/* ── Views Content ── */}
      {viewMode === 'list' && (
        <LessonProgramList
          entries={filteredEntries}
          emptyText={t('noLessons')}
          showTeacher
          showClass
          onAddDay={(ymd) => openCreate(ymd)}
          renderActions={(e) => (
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
        />
      )}

      {viewMode === 'calendar' && (
        <LessonsCalendarView
          entries={filteredEntries}
          onAddDay={(ymd) => openCreate(ymd)}
          renderActions={(e) => (
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
        />
      )}

      {viewMode === 'by_class' && (
        <LessonsByClassView
          entries={filteredEntries}
          onAddLessonForClass={(classId) => openCreate(undefined, classId)}
          renderActions={(e) => (
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
        />
      )}

      {viewMode === 'weekly_plan' && (
        <InstituteWeeklyPlan instituteId={instituteId} />
      )}

      {/* ── Dialogs ── */}
      <AddLessonDialog
        instituteId={instituteId}
        categories={categories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={refresh}
        preselectDate={presetDate}
        preselectClassId={presetClassId}
        editing={editing}
      />
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
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          aria-label={tc('save')}
        >
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
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 className="size-4" />
              {t('deleteLesson')}
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
