'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { AttendanceStatus } from '@/lib/types';
import { useStudentAttendance, useClassProfile } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { MonthCalendar } from './month-calendar';
import { lessonJsDays } from './calendar-utils';
import { STATUS_COLOR, STATUS_ORDER } from './attendance-colors';

/**
 * A student's own attendance: rate + status breakdown + month calendar + log.
 * Reusable in the staff student profile and the student portal. When `classId`
 * is given, scheduled lesson days are outlined in the calendar.
 */
export function StudentAttendanceView({
  studentId,
  classId,
}: {
  studentId: string;
  classId?: string;
}) {
  const t = useTranslations('attendance');
  const locale = useLocale();
  const { data, isLoading } = useStudentAttendance(studentId);
  const { data: classProfile } = useClassProfile(classId ?? '');

  const statusByDay = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const item of data?.log ?? []) map.set(item.date.slice(0, 10), item.status);
    return map;
  }, [data?.log]);

  const lessons = useMemo(
    () => lessonJsDays(classProfile?.schedule ?? []),
    [classProfile?.schedule],
  );

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

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>{t('calendar')}</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthCalendar
            lessons={lessons}
            renderDay={(cell) => {
              const status = statusByDay.get(cell.ymd);
              const dayNum = cell.date.getDate();
              // A recorded day: a filled status-colored tile — instantly readable.
              if (status) {
                return (
                  <div
                    className="flex size-full flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-white"
                    style={{ backgroundColor: STATUS_COLOR[status] }}
                    title={t(status)}
                  >
                    <span className="text-[10px] font-medium opacity-90">{dayNum}</span>
                    <span className="w-full truncate text-[10px] font-bold leading-none">
                      {t(`${status}Short` as 'presentShort')}
                    </span>
                  </div>
                );
              }
              // Scheduled lesson day with no record yet (not counted as absence).
              if (cell.isLessonDay && !cell.isFuture) {
                return (
                  <div
                    className="text-primary/70 flex size-full items-start justify-center pt-1 text-xs font-semibold"
                    title={t('notTaken')}
                  >
                    {dayNum}
                  </div>
                );
              }
              return (
                <span className="text-muted-foreground/60 flex size-full items-start justify-center pt-1 text-xs">
                  {dayNum}
                </span>
              );
            }}
          />
        </CardContent>
      </Card>

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
