'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { RecitationLogItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ratingColor } from './recitation-colors';

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

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noRecitations')}</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {items.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {showStudent && r.studentName ? `${r.studentName} — ` : ''}
              {r.surahName}
            </span>
            <span className="text-muted-foreground text-xs">
              {t('ayahRange')}: {r.fromAyah}–{r.toAyah} · {t('by')} {r.recitedByName} ·{' '}
              {new Date(r.createdAt).toLocaleDateString(locale)}
            </span>
          </div>
          <Badge
            style={{ backgroundColor: ratingColor(r.rating), color: '#fff', borderColor: 'transparent' }}
          >
            {tr(r.rating)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
