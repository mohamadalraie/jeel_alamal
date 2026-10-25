'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { RecitationLogItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ratingColor } from './recitation-colors';
import { formatTeacherName } from '@/lib/utils';

import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { BookOpen, Calendar, User } from 'lucide-react';

/** Recitation history list. Set `showStudent` for the class view. */
export function RecitationLog({
  items,
  showStudent = false,
}: {
  items: RecitationLogItem[];
  showStudent?: boolean;
}) {
  const t = useTranslations('recitation');
  const tr = useTranslations('ratings');
  const locale = useLocale();
  const router = useRouter();

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm py-4 text-center">{t('noRecitations')}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {items.map((r) => {
        const count = r.toAyah - r.fromAyah + 1;
        return (
          <li key={r.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary shrink-0" />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {showStudent && r.studentName ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.studentId) {
                          router.push(`/dashboard/students/${r.studentId}?tab=recitation`);
                        }
                      }}
                      className={cn(
                        "text-sm font-bold text-foreground",
                        r.studentId && "cursor-pointer hover:text-primary hover:underline"
                      )}
                    >
                      {r.studentName} —
                    </span>
                  ) : null}
                  <span className="text-sm font-bold text-foreground">
                    {r.surahName}
                  </span>
                </div>
                <span className="text-[11px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
                  {count} {t('ayahsShort')} ({r.fromAyah}–{r.toAyah})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {new Date(r.createdAt).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="size-3.5" />
                  {t('by')} {formatTeacherName(r.recitedByName)}
                </span>
              </div>
            </div>
            <Badge
              className="shrink-0 text-xs px-2.5 py-1 font-semibold text-white border-0 shadow-sm"
              style={{ backgroundColor: ratingColor(r.rating) }}
            >
              {tr(r.rating)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
