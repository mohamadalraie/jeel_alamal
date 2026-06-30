'use client';

import { useTranslations, useLocale } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { useStudentClassLessons } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';

/**
 * The student's view of their class lessons: past lessons only, name +
 * description only (no sources, no future). Gated by the per-class toggle on the
 * backend — a 403 means it's disabled, shown as an empty state. Spec 008.
 */
export function StudentLessonsView({ classId }: { classId: string }) {
  const t = useTranslations('lessons');
  const locale = useLocale();
  const { data, isLoading, isError } = useStudentClassLessons(classId);

  if (isLoading) return <ListSkeleton />;
  if (isError || !data || data.entries.length === 0) {
    return <EmptyState icon={BookOpen} title={t('noStudentLessons')} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {data.entries.map((e) => (
        <Card key={e.lessonClassId}>
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <BookOpen className="text-primary size-4 shrink-0" />
                {e.kind === 'recitation' ? t('recitation') : e.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(e.date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {e.kind === 'lesson' && e.description && (
              <p className="text-muted-foreground text-sm">{e.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
