'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { AttendanceCounts, ScheduleSlot } from '@/lib/types';
import { useClassAttendance } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { MonthCalendar } from './month-calendar';
import { TakeAttendanceDialog } from './take-attendance-dialog';
import { lessonJsDays } from './calendar-utils';
import { STATUS_COLOR } from './attendance-colors';

const attendedOf = (c: AttendanceCounts) => c.present + c.late;

/** Tile color for a recorded day: green (healthy) → amber → red by rate. */
function healthColor(attended: number, total: number): string {
  const rate = total === 0 ? 0 : (attended / total) * 100;
  if (rate >= 75) return STATUS_COLOR.present;
  if (rate >= 50) return STATUS_COLOR.justified;
  return STATUS_COLOR.absent;
}

/**
 * Lessons-tab calendar (spec 007 enhancement): a month grid of the class's
 * lesson days. Days with a taken session show attended/total; scheduled days
 * with no session yet are outlined (NOT counted as absence — the teacher can
 * backfill them). Tap any past/today day to take or edit its attendance.
 */
export function ClassLessonsCalendar({
  classId,
  schedule,
}: {
  classId: string;
  schedule: (ScheduleSlot & { id: string })[];
}) {
  const t = useTranslations('attendance');
  const { data, isLoading } = useClassAttendance(classId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>();

  const lessons = useMemo(() => lessonJsDays(schedule), [schedule]);
  const sessionMap = useMemo(() => {
    const map = new Map<string, AttendanceCounts & { total: number }>();
    for (const s of data?.sessions ?? []) map.set(s.date.slice(0, 10), { ...s.counts, total: s.total });
    return map;
  }, [data?.sessions]);

  if (isLoading || !data) return <ListSkeleton />;

  if (data.roster.length === 0) {
    return <EmptyState title={t('noStudents')} />;
  }

  const openFor = (ymd: string) => {
    setSelectedDate(ymd);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('lessonsCalendar')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <MonthCalendar
          lessons={lessons}
          renderDay={(cell) => {
            const summary = sessionMap.get(cell.ymd);
            const dayNum = cell.date.getDate();

            // A recorded session: a filled tile colored by attendance health,
            // showing attended/total. Tap to edit.
            if (summary) {
              const attended = attendedOf(summary);
              const color = healthColor(attended, summary.total);
              return (
                <button
                  type="button"
                  onClick={() => openFor(cell.ymd)}
                  title={t('editAttendance')}
                  className="flex size-full flex-col items-center justify-center gap-0.5 rounded-md text-white transition hover:brightness-110"
                  style={{ backgroundColor: color }}
                >
                  <span className="text-[10px] font-medium opacity-90">{dayNum}</span>
                  <span className="text-sm font-bold tabular-nums leading-none">
                    {attended}/{summary.total}
                  </span>
                </button>
              );
            }

            // A scheduled lesson day with no session yet (not future): a clear,
            // inviting "record" affordance. Never counts as absence.
            if (cell.isLessonDay && !cell.isFuture) {
              return (
                <button
                  type="button"
                  onClick={() => openFor(cell.ymd)}
                  title={t('tapToRecord')}
                  className="text-primary hover:bg-primary/15 flex size-full flex-col items-center justify-center gap-0.5 rounded-md"
                >
                  <span className="text-[11px] font-semibold">{dayNum}</span>
                  <span className="bg-primary/20 grid size-5 place-items-center rounded-full">
                    <Plus className="size-3" />
                  </span>
                </button>
              );
            }

            // Future lesson day: marked as a class day (wrapper tint) but inert.
            if (cell.isLessonDay && cell.isFuture) {
              return (
                <div className="text-primary/70 flex size-full items-start justify-center pt-1 text-xs font-semibold">
                  {dayNum}
                </div>
              );
            }

            // Other in-month day: allow a make-up take if not future.
            return cell.isFuture ? (
              <span className="text-muted-foreground/50 flex size-full items-start justify-center pt-1 text-xs">
                {dayNum}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openFor(cell.ymd)}
                title={t('tapToRecord')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-full items-start justify-center rounded-md pt-1 text-xs"
              >
                {dayNum}
              </button>
            );
          }}
        />

        {/* Legend */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="border-primary/40 bg-primary/10 inline-block size-3 rounded border" />
            {t('lessonDayLegend')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded" style={{ backgroundColor: '#16A34A' }} />
            {t('takenLegend')}
          </span>
          <span className="flex items-center gap-1.5">
            <Plus className="text-primary size-3" />
            {t('notTaken')}
          </span>
        </div>

        {/* Controlled take/edit dialog for the chosen day */}
        <TakeAttendanceDialog
          classId={classId}
          roster={data.roster}
          onDone={() => {}}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialDate={selectedDate}
          withTrigger={false}
        />
      </CardContent>
    </Card>
  );
}
