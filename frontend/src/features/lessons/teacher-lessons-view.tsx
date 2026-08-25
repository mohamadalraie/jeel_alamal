'use client';

import { useTranslations } from 'next-intl';
import { CalendarClock } from 'lucide-react';
import { useMyLessons } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { LessonProgramList } from './lesson-program-list';
import { LessonCard } from './lesson-card';
import { LessonTimerActions } from './lesson-timer-actions';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * A teacher's assigned lessons (spec 008/009): the next lesson highlighted, then
 * the full program grouped by month/day — matching the manager الدروس view — with
 * a start/resume control on each lesson.
 */
export function TeacherLessonsView() {
  const t = useTranslations('lessons');
  const { data, isLoading } = useMyLessons();

  if (isLoading || !data) return <ListSkeleton />;

  const today = todayISO();
  const next = data.entries.find((e) => e.isNext) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Next lesson highlight (only if it is today or later) */}
      {next && next.date >= today && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-2 py-4">
            <span className="text-primary flex items-center gap-1.5 text-xs font-semibold">
              <CalendarClock className="size-4" />
              {t('nextLesson')}
            </span>
            <LessonCard
              entry={next}
              showClass
              actions={<LessonTimerActions entry={next} />}
            />
          </CardContent>
        </Card>
      )}

      <LessonProgramList
        entries={data.entries}
        emptyText={t('noMyLessons')}
        showClass
        renderActions={(e) => <LessonTimerActions entry={e} />}
      />
    </div>
  );
}
