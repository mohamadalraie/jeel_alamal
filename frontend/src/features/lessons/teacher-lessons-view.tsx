'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, CalendarDays, CalendarRange, School } from 'lucide-react';
import { useMyLessons } from '@/lib/queries';
import { useInstitute } from '@/features/layout/institute-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/features/shared/skeletons';
import { LessonCard } from './lesson-card';
import { LessonTimerActions } from './lesson-timer-actions';
import { LessonsSummaryCards } from './lessons-summary-cards';
import { LessonsCalendarView } from './lessons-calendar-view';
import { LessonsByClassView } from './lessons-by-class-view';
import { StudentWeeklyPlanView } from '@/features/classes/student-weekly-plan';

type TeacherViewMode = 'calendar' | 'by_class' | 'weekly_plan';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * A teacher's assigned lessons (spec 008/009 / Advanced view):
 * Provides the next lesson highlight, KPI summary cards, and the 3 clean views:
 * Calendar, By Class, and Weekly Plan, with a start/resume control on each lesson.
 */
export function TeacherLessonsView() {
  const t = useTranslations('lessons');
  const { selected } = useInstitute();
  const { data, isLoading } = useMyLessons(selected?.id);

  const [viewMode, setViewMode] = useState<TeacherViewMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const today = todayISO();

  const upcomingEntries = useMemo(() => {
    return (data?.entries ?? []).filter((e) => e.isNext && e.date >= today);
  }, [data?.entries, today]);

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

  if (isLoading || !data) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Next lessons highlight ── */}
      {upcomingEntries.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3 py-4">
            <span className="text-primary flex items-center gap-1.5 text-xs font-semibold">
              <CalendarClock className="size-4" />
              {t('nextLesson')}
            </span>
            <div className="flex flex-col gap-3">
              {upcomingEntries.map((entry) => (
                <LessonCard
                  key={entry.lessonClassId}
                  entry={entry}
                  showClass
                  actions={<LessonTimerActions entry={entry} />}
                />
              ))}
            </div>
          </CardContent>
        </Card>
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
            <span>حسب الحلقة</span>
          </Button>
          {selected?.id && (
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
          )}
        </div>
      </div>

      {/* ── View Mode: Calendar ── */}
      {viewMode === 'calendar' && (
        <LessonsCalendarView
          entries={filteredEntries}
          renderActions={(e) => <LessonTimerActions entry={e} />}
        />
      )}

      {/* ── View Mode: By Class ── */}
      {viewMode === 'by_class' && (
        <LessonsByClassView
          entries={filteredEntries}
          renderActions={(e) => <LessonTimerActions entry={e} />}
        />
      )}

      {/* ── View Mode: Weekly Plan ── */}
      {viewMode === 'weekly_plan' && selected?.id && (
        <StudentWeeklyPlanView instituteId={selected.id} />
      )}
    </div>
  );
}
