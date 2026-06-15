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
import { useClassRecitation, useSurahs, useQueryClient, qk } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { AddRecitationDialog } from './add-recitation-dialog';
import { RecitationLog } from './recitation-log';

/** Class profile "التسميع" tab: activity chart + every student's recitation log. */
export function ClassRecitationTab({ classId }: { classId: string }) {
  const t = useTranslations('recitation');
  const locale = useLocale();
  const qc = useQueryClient();
  const { data, isLoading } = useClassRecitation(classId);
  const { data: surahs = [] } = useSurahs();

  // Aggregate all students' ayahs recited per calendar day.
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

  const refresh = () => qc.invalidateQueries({ queryKey: qk.classRecitation(classId) });

  return (
    <div className="flex flex-col gap-4">
      {/* Activity chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('classChart')}</CardTitle>
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

      {/* Log */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('log')}</CardTitle>
          {data.students.length > 0 && (
            <AddRecitationDialog surahs={surahs} students={data.students} onDone={refresh} />
          )}
        </CardHeader>
        <CardContent>
          <RecitationLog items={data.log} showStudent />
        </CardContent>
      </Card>
    </div>
  );
}
