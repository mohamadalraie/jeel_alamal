'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { TrendingUp } from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { AttendanceStatus } from '@/lib/types';
import { useStudentAttendance, useClassProfile } from '@/lib/queries';
import { formatDateLocale } from '@/lib/utils';
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

  // Cumulative attendance evolution curve over time with real time coordinates
  const attendanceChartData = useMemo(() => {
    if (!data?.log || data.log.length === 0) return [];
    const sorted = [...data.log].sort((a, b) => a.date.localeCompare(b.date));
    let runningAttended = 0;
    let runningTotal = 0;

    return sorted.map((item) => {
      runningTotal += 1;
      if (item.status === 'present' || item.status === 'late') {
        runningAttended += 1;
      }
      const rate = Math.round((runningAttended / runningTotal) * 100);
      return {
        timestamp: new Date(`${item.date.slice(0, 10)}T12:00:00Z`).getTime(),
        date: item.date,
        status: item.status,
        rate,
      };
    });
  }, [data?.log]);

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

      {/* Attendance Evolution Curve with real time coordinates and line connecting dots */}
      {attendanceChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>منحنى نسبة الحضور التراكمي عبر الزمن</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
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
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  width={32}
                  tickFormatter={(v) => `٪${v}`}
                />
                <Tooltip
                  labelFormatter={(val) =>
                    new Date(val as number).toLocaleDateString(formatDateLocale(locale), {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                  formatter={(val: any, _name: any, item: any) => [
                    `٪${val} (${t(item?.payload?.status ?? 'present')})`,
                    t('overallRate'),
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name={t('overallRate')}
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10B981', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
                <span>{new Date(item.date).toLocaleDateString(formatDateLocale(locale), { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
