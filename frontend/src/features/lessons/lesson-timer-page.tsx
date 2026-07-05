'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, BookOpen, Clock, Play } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { endLesson, startLesson } from '@/lib/api';
import { useLessonTimer, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { LessonStatusBadge } from './lesson-status-badge';

/** Format a whole number of seconds as MM:SS (or HH:MM:SS past an hour). */
function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * The teacher's live lesson timer (spec 009). Counts up from the server-recorded
 * `actualStartTime`, so a page refresh reconstructs the elapsed time exactly
 * without restarting. Ending the lesson computes the final status server-side.
 */
export function LessonTimerPage({ lessonClassId }: { lessonClassId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;

  const { data, isLoading, isError } = useLessonTimer(lessonClassId);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  // Tick every second only while the lesson is running.
  const running = data?.status === 'started' && !!data.actualStartTime;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsedSeconds = useMemo(() => {
    if (!data?.actualStartTime) return 0;
    return (now - new Date(data.actualStartTime).getTime()) / 1000;
  }, [now, data?.actualStartTime]);

  const back = () => router.push('/dashboard/my-lessons');
  const refreshTimer = () =>
    qc.invalidateQueries({ queryKey: qk.lessonTimer(lessonClassId) });

  if (isLoading) return <ListSkeleton />;
  if (isError || !data) return <EmptyState icon={BookOpen} title={t('timerNotFound')} />;

  const title = data.kind === 'recitation' ? t('recitation') : data.name;
  const expected = data.expectedDurationMinutes;
  // Progress against expected (visual only; capped at 100%).
  const expectedSeconds = expected != null ? expected * 60 : null;
  const progress =
    expectedSeconds && expectedSeconds > 0
      ? Math.min(100, (elapsedSeconds / expectedSeconds) * 100)
      : null;
  const overExpected = expectedSeconds != null && elapsedSeconds > expectedSeconds;

  async function start() {
    setBusy(true);
    try {
      await startLesson(lessonClassId);
      setNow(Date.now());
      await refreshTimer();
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    setBusy(true);
    try {
      const result = await endLesson(lessonClassId);
      await Promise.all([
        refreshTimer(),
        qc.invalidateQueries({
          predicate: (q) =>
            ['my-lessons', 'class-lessons', 'institute-lessons'].includes(
              q.queryKey[0] as string,
            ),
        }),
      ]);
      notify.success(t(`status_${result.status}`));
      back();
    } catch (err) {
      notify.error(err, tc('error'));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={back} aria-label={t('back')}>
          <Back className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">{t('lessonTimer')}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {/* Lesson identity */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="flex items-center gap-1.5 text-lg font-semibold">
              <BookOpen className="text-primary size-5" />
              {title}
            </span>
            <span className="text-muted-foreground text-sm">{data.className}</span>
            {data.ofTotal > 1 && (
              <span className="text-muted-foreground text-xs">
                {t('lessonNofM', { n: data.ordinal, total: data.ofTotal })}
              </span>
            )}
          </div>

          <LessonStatusBadge status={data.status} />

          {/* Elapsed timer (running) */}
          {data.status === 'started' && (
            <>
              <div
                className={`font-mono text-5xl font-bold tabular-nums ${
                  overExpected ? 'text-destructive' : 'text-foreground'
                }`}
                dir="ltr"
                aria-live="polite"
              >
                {formatElapsed(elapsedSeconds)}
              </div>
              {expected != null && (
                <div className="flex w-full flex-col gap-1">
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        overExpected ? 'bg-destructive' : 'bg-primary'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground flex items-center gap-1 self-center text-xs">
                    <Clock className="size-3" />
                    {t('expectedOf', { n: expected })}
                  </span>
                </div>
              )}
              <ConfirmDialog
                title={t('endLesson')}
                message={t('endLessonConfirm')}
                onConfirm={end}
                trigger={
                  <Button size="lg" className="w-full" disabled={busy}>
                    {t('endLesson')}
                  </Button>
                }
              />
            </>
          )}

          {/* Pending — reached the page without starting yet */}
          {data.status === 'pending' && (
            <>
              {expected != null && (
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Clock className="size-4" />
                  {t('expectedOf', { n: expected })}
                </span>
              )}
              <Button size="lg" className="w-full" onClick={start} disabled={busy}>
                <Play data-icon="inline-start" className="size-4" />
                {t('startLesson')}
              </Button>
            </>
          )}

          {/* Terminal — already ended */}
          {data.status !== 'pending' && data.status !== 'started' && (
            <Button variant="secondary" className="w-full" onClick={back}>
              {t('back')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
