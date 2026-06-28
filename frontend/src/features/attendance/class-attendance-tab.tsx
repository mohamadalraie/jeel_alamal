'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AlertTriangle, Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttendanceCounts, StudentAttendanceStats } from '@/lib/types';
import { useClassAttendance } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

/** Students at/under this rate (with at least one record) are flagged. */
const LOW_RATE = 50;

type Range = 'all' | '4w' | '12w';

/** Class profile "الحضور" tab: stats overview + per-session chart + per-student table. */
export function ClassAttendanceTab({ classId }: { classId: string }) {
  const t = useTranslations('attendance');
  const locale = useLocale();
  const { data, isLoading } = useClassAttendance(classId);
  const [range, setRange] = useState<Range>('all');

  // Attendance rate per session within the selected window, oldest→newest.
  const rateData = useMemo(() => {
    const cutoff = rangeCutoff(range);
    return [...(data?.sessions ?? [])]
      .filter((s) => !cutoff || s.date.slice(0, 10) >= cutoff)
      .reverse()
      .map((s) => ({
        date: new Date(s.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        rate: rateOf(s.counts),
      }));
  }, [data?.sessions, locale, range]);

  if (isLoading || !data) return <ListSkeleton />;

  const exportCsv = () => downloadCsv(data.students, t, classId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('tab')}</h2>
        {data.roster.length > 0 ? (
          <TakeAttendanceDialog classId={classId} roster={data.roster} onDone={() => {}} />
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
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle>{t('rateChart')}</CardTitle>
                <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('rangeAll')}</SelectItem>
                    <SelectItem value="4w">{t('range4w')}</SelectItem>
                    <SelectItem value="12w">{t('range12w')}</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle>{t('byStudent')}</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download data-icon="inline-start" />
                {t('exportCsv')}
              </Button>
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
                  {data.students.map((st) => {
                    const low = st.total > 0 && st.rate < LOW_RATE;
                    return (
                      <TableRow key={st.studentId}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5">
                            {low && (
                              <AlertTriangle
                                className="size-3.5 shrink-0"
                                style={{ color: STATUS_COLOR.absent }}
                                aria-label={t('lowAttendance')}
                              />
                            )}
                            {st.studentName}
                          </span>
                        </TableCell>
                        {STATUS_ORDER.map((s) => (
                          <TableCell key={s} className="text-center tabular-nums">
                            <span style={{ color: st.counts[s] > 0 ? STATUS_COLOR[s] : undefined }}>
                              {st.counts[s]}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell
                          className="text-center font-semibold tabular-nums"
                          style={low ? { color: STATUS_COLOR.absent } : undefined}
                        >
                          ٪{st.rate}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-muted-foreground mt-2 text-xs">
                {t('lowAttendanceHint', { n: LOW_RATE })}
              </p>
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

/** ISO cutoff for the chart window, or null for "all". */
function rangeCutoff(range: Range): string | null {
  if (range === 'all') return null;
  const weeks = range === '4w' ? 4 : 12;
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** Build + download a per-student attendance CSV (BOM for Excel Arabic). */
function downloadCsv(
  students: StudentAttendanceStats[],
  t: (k: string) => string,
  classId: string,
) {
  const header = [t('student'), t('present'), t('late'), t('justified'), t('absent'), t('rate')];
  const rows = students.map((s) => [
    s.studentName,
    s.counts.present,
    s.counts.late,
    s.counts.justified,
    s.counts.absent,
    `${s.rate}%`,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${classId.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
