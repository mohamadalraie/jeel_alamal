'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Play, Timer } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { startLesson } from '@/lib/api';
import { useQueryClient } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import type { ProgramEntry } from '@/lib/types';
import { toYMD } from '@/features/attendance/calendar-utils';

const TODAY_YMD = toYMD(new Date());

const LESSON_LIST_KEYS = ['my-lessons', 'class-lessons', 'institute-lessons'];

/**
 * Start / resume control for a lesson binding (spec 009). Shown only to the
 * assigned teacher: "Start" while pending and due, "Resume" while in progress.
 * Both routes to the live timer page.
 */
export function LessonTimerActions({ entry }: { entry: ProgramEntry }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const goToTimer = () => router.push(`/dashboard/lesson-timer/${entry.lessonClassId}`);

  if (entry.status === 'started') {
    return (
      <Button size="sm" variant="secondary" onClick={goToTimer}>
        <Timer data-icon="inline-start" className="size-4" />
        {t('resumeLesson')}
      </Button>
    );
  }

  // Only a pending lesson whose day has arrived can be started.
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
