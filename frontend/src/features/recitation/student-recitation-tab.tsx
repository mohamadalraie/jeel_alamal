'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatDateLocale } from '@/lib/utils';
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

  // Recitation amount (ayahs) per day, oldest→newest, with true time coordinates.
  const chartData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of data?.log ?? []) {
      const day = r.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + (r.toAyah - r.fromAyah + 1));
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, ayahs]) => ({
        timestamp: new Date(`${date}T12:00:00Z`).getTime(),
        date,
        ayahs,
      }));
  }, [data?.log]);

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

      {/* Activity over time with real time coordinates and connecting line */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('amountChart')}</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted opacity-50" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString(formatDateLocale(locale), {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  width={28}
                />
                <Tooltip
                  labelFormatter={(val) =>
                    new Date(val as number).toLocaleDateString(formatDateLocale(locale), {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                  formatter={(val) => [`${val} ${t('ayahsShort')}`, t('ayahsShort')]}
                />
                <Line
                  type="monotone"
                  dataKey="ayahs"
                  name={t('ayahsShort')}
                  stroke="#BE9B5F"
                  strokeWidth={2.5}
                  dot={{ fill: '#BE9B5F', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
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
