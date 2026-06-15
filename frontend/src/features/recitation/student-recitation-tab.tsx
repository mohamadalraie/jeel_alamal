'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStudentRecitation, useSurahs, useQueryClient, qk } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { AddRecitationDialog } from './add-recitation-dialog';
import { HeartMap } from './heart-map';
import { RecitationLog } from './recitation-log';

/** Student profile "تسميع القرآن" tab: summary + activity chart + map + log. */
export function StudentRecitationTab({ studentId }: { studentId: string }) {
  const t = useTranslations('recitation');
  const tc = useTranslations('common');
  const tr = useTranslations('ratings');
  const locale = useLocale();
  const qc = useQueryClient();
  const { data, isLoading } = useStudentRecitation(studentId);
  const { data: surahs = [] } = useSurahs();

  // Recitation amount (ayahs) per day, oldest→newest, for the activity chart.
  const chartData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of data?.log ?? []) {
      const day = r.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (r.toAyah - r.fromAyah + 1));
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, ayahs]) => ({
        date: new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        ayahs,
      }));
  }, [data?.log, locale]);

  if (isLoading || !data) return <ListSkeleton />;

  const { summary, heart, log } = data;
  const last = summary.lastRecitation;
  const refresh = () => qc.invalidateQueries({ queryKey: qk.studentRecitation(studentId) });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <AddRecitationDialog surahs={surahs} studentId={studentId} onDone={refresh} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('fullCount')} value={summary.fullCount} />
        <Stat label={t('partialCount')} value={summary.partialCount} />
        <Stat label={t('totalRecitations')} value={summary.totalRecitations} />
        <Card>
          <CardContent className="flex flex-col gap-0.5 py-4">
            <span className="text-muted-foreground text-xs">{t('lastRecitation')}</span>
            {last ? (
              <>
                <span className="text-sm font-semibold">{last.surahName}</span>
                <span className="text-muted-foreground text-xs">
                  {last.fromAyah}–{last.toAyah} · {tr(last.rating)} ·{' '}
                  {new Date(last.createdAt).toLocaleDateString(locale)}
                </span>
              </>
            ) : (
              <span className="text-sm">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity over time */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('amountChart')}</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" width={28} />
                <Tooltip />
                <Bar dataKey="ayahs" name={t('ayahsShort')} fill="#BE9B5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Memorization map */}
      <Card>
        <CardHeader>
          <CardTitle>{t('memorizationMap')}</CardTitle>
        </CardHeader>
        <CardContent>
          <HeartMap cells={heart} />
        </CardContent>
      </Card>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>{t('log')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecitationLog items={log} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 py-4">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </CardContent>
    </Card>
  );
}
