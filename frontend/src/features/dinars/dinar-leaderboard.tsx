'use client';

import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';
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
  const { data, isLoading, isError } = useDinarLeaderboard(instituteId, classId);

  if (isLoading) return <ListSkeleton />;
  if (isError || !data) return <EmptyState icon={Trophy} title={t('leaderboardUnavailable')} />;
  if (data.rows.length === 0) return <EmptyState icon={Trophy} title={t('noRanking')} />;

  return (
    <div className="flex flex-col gap-1.5">
      {data.rows.map((row) => (
        <Card key={row.studentId}>
          <CardContent className="flex items-center gap-3 py-2.5">
            <span className="text-muted-foreground w-7 text-center text-sm font-bold tabular-nums">
              {row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
            <DinarBadge amount={row.balance} showIcon={false} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
