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
import { formatDateLocale } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { User, Users } from 'lucide-react';
import { useClassRecitation, useSurahs, useQueryClient, qk } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { AddRecitationDialog } from './add-recitation-dialog';
import { RecitationLog } from './recitation-log';

/** Class profile "التسميع" tab: activity chart + every student's recitation log. */
export function ClassRecitationTab({ classId }: { classId: string }) {
  const t = useTranslations('recitation');
  const locale = useLocale();
  const router = useRouter();
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
        date: new Date(date).toLocaleDateString(formatDateLocale(locale), { month: 'short', day: 'numeric' }),
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

      {/* Quick student recitation access */}
      {data.students.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3 bg-muted/20 border-b">
            <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                طلاب الحلقة ({data.students.length}) — اضغط على أي طالب لفتح واجهة تسميعه مباشرة:
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {data.students.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/students/${st.id}?tab=recitation`)}
                  className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary active:scale-95 shadow-2xs"
                >
                  <User className="size-3 text-muted-foreground" />
                  <span>{st.name}</span>
                </button>
              ))}
            </div>
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
