'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttendanceCounts } from '@/lib/types';
import { useClassAttendance } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListSkeleton } from '@/features/shared/skeletons';
import { TakeAttendanceDialog } from './take-attendance-dialog';
import { STATUS_COLOR, STATUS_ORDER } from './attendance-colors';

/** Class profile "الحضور" tab: stats overview + per-session chart + per-student table. */
export function ClassAttendanceTab({ classId }: { classId: string }) {
  const t = useTranslations('attendance');
  const locale = useLocale();
  const { data, isLoading } = useClassAttendance(classId);

  // Attendance rate per session, oldest→newest, for the trend chart.
  const rateData = useMemo(() => {
    return [...(data?.sessions ?? [])]
      .reverse()
      .map((s) => ({
        date: new Date(s.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        rate: rateOf(s.counts),
      }));
  }, [data?.sessions, locale]);

  if (isLoading || !data) return <ListSkeleton />;

  const refresh = () => {};

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('tab')}</h2>
        {data.roster.length > 0 ? (
          <TakeAttendanceDialog classId={classId} roster={data.roster} onDone={refresh} />
        ) : null}
      </div>

      {data.roster.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {t('noStudents')}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t('overallRate')} value={`٪${data.rate}`} />
            <Stat label={t('sessionCount')} value={data.sessionCount} />
            <Stat label={t('totalRecords')} value={totalOf(data.totals)} />
            <Card>
              <CardContent className="flex flex-col gap-1 py-4">
                <span className="text-muted-foreground text-xs">{t('distribution')}</span>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {STATUS_ORDER.map((s) => (
                    <span key={s} className="flex items-center gap-1 text-xs">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[s] }}
                      />
                      <span className="tabular-nums font-semibold">{data.totals[s]}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance rate over sessions */}
          {rateData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('rateChart')}</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rateData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" width={32} />
                    <Tooltip formatter={(v) => `٪${v}`} />
                    <Bar dataKey="rate" name={t('rate')} radius={[4, 4, 0, 0]}>
                      {rateData.map((_, i) => (
                        <Cell key={i} fill="#16A34A" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Per-student table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('byStudent')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('student')}</TableHead>
                    {STATUS_ORDER.map((s) => (
                      <TableHead key={s} className="text-center">
                        {t(`${s}Short` as 'presentShort')}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">{t('rate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((st) => (
                    <TableRow key={st.studentId}>
                      <TableCell className="font-medium">{st.studentName}</TableCell>
                      {STATUS_ORDER.map((s) => (
                        <TableCell key={s} className="text-center tabular-nums">
                          <span style={{ color: st.counts[s] > 0 ? STATUS_COLOR[s] : undefined }}>
                            {st.counts[s]}
                          </span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-semibold tabular-nums">
                        ٪{st.rate}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
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

const ATTENDED = ['present', 'late'] as const;
function totalOf(c: AttendanceCounts): number {
  return c.present + c.absent + c.justified + c.late;
}
function rateOf(c: AttendanceCounts): number {
  const total = totalOf(c);
  if (total === 0) return 0;
  const attended = ATTENDED.reduce((sum, k) => sum + c[k], 0);
  return Math.round((attended / total) * 100);
}
