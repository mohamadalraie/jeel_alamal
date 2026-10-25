'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useDinarLeaderboard } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { DinarBadge } from './dinar-badge';

/** Ranked board by net balance for a class or the whole institute. */
export function DinarLeaderboard({
  instituteId,
  classId,
}: {
  instituteId: string;
  classId?: string;
}) {
  const t = useTranslations('dinars');
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading, isError } = useDinarLeaderboard(instituteId, classId);

  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;

  if (isLoading) return <ListSkeleton />;
  if (isError || !data) return <EmptyState icon={Trophy} title={t('leaderboardUnavailable')} />;
  if (data.rows.length === 0) return <EmptyState icon={Trophy} title={t('noRanking')} />;

  return (
    <div className="flex flex-col gap-1.5">
      {data.rows.map((row) => (
        <Card
          key={row.studentId}
          onClick={() => router.push(`/dashboard/students/${row.studentId}?tab=dinars`)}
          className="group cursor-pointer transition-all hover:bg-muted/60 hover:shadow-sm"
        >
          <CardContent className="flex items-center gap-3 py-2.5">
            <span className="text-muted-foreground w-7 text-center text-sm font-bold tabular-nums">
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary transition-colors">
              {row.name}
            </span>
            <div className="flex items-center gap-2">
              <DinarBadge amount={row.balance} showIcon={false} />
              <Chevron className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
