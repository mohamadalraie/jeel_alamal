'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useStudentAttendance } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { STATUS_COLOR, STATUS_ORDER } from './attendance-colors';

/** A student's own attendance: rate + status breakdown + dated log. Reusable. */
export function StudentAttendanceView({ studentId }: { studentId: string }) {
  const t = useTranslations('attendance');
  const locale = useLocale();
  const { data, isLoading } = useStudentAttendance(studentId);

  if (isLoading || !data) return <ListSkeleton />;

  if (data.total === 0) {
    return <EmptyState title={t('noSessions')} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('overallRate')} value={`٪${data.rate}`} />
        <Stat label={t('sessionCount')} value={data.total} />
        {STATUS_ORDER.slice(0, 2).map((s) => (
          <Card key={s}>
            <CardContent className="flex flex-col gap-0.5 py-4">
              <span className="text-2xl font-bold tabular-nums" style={{ color: STATUS_COLOR[s] }}>
                {data.counts[s]}
              </span>
              <span className="text-muted-foreground text-xs">{t(s)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown chips */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUS_ORDER.map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-sm">
            <span className="inline-block size-3 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
            <span className="text-muted-foreground">{t(s)}:</span>
            <span className="font-semibold tabular-nums">{data.counts[s]}</span>
          </span>
        ))}
      </div>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>{t('attendanceLog')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {data.log.map((item, i) => (
              <li key={`${item.date}-${i}`} className="flex items-center justify-between py-2 text-sm">
                <span>{new Date(item.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: STATUS_COLOR[item.status] }}
                >
                  {t(item.status)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 py-4">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </CardContent>
    </Card>
  );
}
