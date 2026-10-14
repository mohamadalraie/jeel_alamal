'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarPlus, FileText, Play, Timer } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { startLesson } from '@/lib/api';
import { useQueryClient } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import type { ProgramEntry } from '@/lib/types';
import { toYMD } from '@/features/attendance/calendar-utils';
import { MaterializeLessonDialog } from './materialize-lesson-dialog';
import { LessonReportViewDialog } from './lesson-report-view-dialog';

const TODAY_YMD = toYMD(new Date());

const LESSON_LIST_KEYS = ['my-lessons', 'class-lessons', 'institute-lessons'];

/**
 * Start / resume / materialize / view report controls for a lesson binding (spec 009 & 012).
 * Supports unmaterialized weekly slots, active timers, and completed reports.
 */
export function LessonTimerActions({ entry }: { entry: ProgramEntry }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [materializeOpen, setMaterializeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const goToTimer = () => router.push(`/dashboard/lesson-timer/${entry.lessonClassId}`);

  // Unmaterialized weekly schedule template slot
  if (entry.isMaterialized === false) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setMaterializeOpen(true)}
        >
          <CalendarPlus className="size-3.5" />
          {t('materializeLessonBtn')}
        </Button>
        <MaterializeLessonDialog
          open={materializeOpen}
          onOpenChange={setMaterializeOpen}
          slot={entry}
        />
      </>
    );
  }

  // Active / running lesson
  if (entry.status === 'started') {
    return (
      <Button size="sm" variant="secondary" onClick={goToTimer}>
        <Timer data-icon="inline-start" className="size-4" />
        {t('resumeLesson')}
      </Button>
    );
  }

  // Completed lesson with potential report
  if (
    entry.status === 'finished' ||
    entry.status === 'over_time' ||
    entry.status === 'under_time'
  ) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => setReportOpen(true)}
        >
          <FileText className="size-3.5" />
          {t('viewReportBtn')}
        </Button>
        <LessonReportViewDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          lessonClassId={entry.lessonClassId}
        />
      </>
    );
  }

  // Only a pending lesson whose day has arrived can be started
  if (entry.status !== 'pending' || entry.date > TODAY_YMD) return null;

  async function start() {
    setBusy(true);
    try {
      await startLesson(entry.lessonClassId);
      await qc.invalidateQueries({
        predicate: (q) => LESSON_LIST_KEYS.includes(q.queryKey[0] as string),
      });
      goToTimer();
    } catch (err) {
      notify.error(err, tc('error'));
      setBusy(false);
    }
  }

  return (
    <Button size="sm" onClick={start} disabled={busy}>
      <Play data-icon="inline-start" className="size-4" />
      {t('startLesson')}
    </Button>
  );
}
