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
  const upcomingEntries = data.entries.filter((e) => e.isNext && e.date >= today);

  return (
    <div className="flex flex-col gap-5">
      {/* Next lessons highlight (all lessons on the upcoming date) */}
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

      <LessonProgramList
        entries={data.entries}
        emptyText={t('noMyLessons')}
        showClass
        renderActions={(e) => <LessonTimerActions entry={e} />}
      />
    </div>
  );
}
