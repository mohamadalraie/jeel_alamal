'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CalendarClock } from 'lucide-react';
import { useMyLessons } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { LessonCard } from './lesson-card';

const todayISO = () => new Date().toISOString().slice(0, 10);

/** A teacher's assigned lessons: next highlighted, then upcoming + past. Spec 008. */
export function TeacherLessonsView() {
  const t = useTranslations('lessons');
  const locale = useLocale();
  const { data, isLoading } = useMyLessons();

  const groups = useMemo(() => {
    const today = todayISO();
    const entries = data?.entries ?? [];
    const next = entries.find((e) => e.isNext) ?? null;
    const upcoming = entries.filter((e) => e.date >= today && !e.isNext);
    const past = entries.filter((e) => e.date < today).reverse();
    return { next, upcoming, past };
  }, [data?.entries]);

  if (isLoading || !data) return <ListSkeleton />;
  if (data.entries.length === 0) return <EmptyState icon={CalendarClock} title={t('noMyLessons')} />;

  const dateLabel = (d: string) =>
    new Date(d).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-5">
      {/* Next lesson highlight */}
      {groups.next && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-2 py-4">
            <span className="text-primary flex items-center gap-1.5 text-xs font-semibold">
              <CalendarClock className="size-4" />
              {t('nextLesson')} · {dateLabel(groups.next.date)}
            </span>
            <LessonCard entry={groups.next} showClass />
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {groups.upcoming.length > 0 && (
        <Section title={t('upcoming')}>
          {groups.upcoming.map((e) => (
            <div key={e.lessonClassId} className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">{dateLabel(e.date)}</span>
              <LessonCard entry={e} showClass />
            </div>
          ))}
        </Section>
      )}

      {/* Past */}
      {groups.past.length > 0 && (
        <Section title={t('past')}>
          {groups.past.map((e) => (
            <div key={e.lessonClassId} className="flex flex-col gap-1 opacity-75">
              <span className="text-muted-foreground text-xs">{dateLabel(e.date)}</span>
              <LessonCard entry={e} showClass />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
