'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Play,
  ClipboardCheck,
  Users,
  LayoutDashboard,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { startLesson, resolveAsset } from '@/lib/api';
import { useLessonTimer, useClassProfile, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { TakeAttendanceDialog } from '@/features/attendance/take-attendance-dialog';
import { LessonStatusBadge } from './lesson-status-badge';
import { LessonTimerDinars } from './lesson-timer-dinars';
import { LessonTimerNotes } from './lesson-timer-notes';
import { LessonReportDialog } from './lesson-report-dialog';
import { LessonReportViewDialog } from './lesson-report-view-dialog';

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
 * The teacher's live lesson timer (spec 009 & 012). Counts up from the server-recorded
 * `actualStartTime`, and prompts for a comprehensive Lesson Report upon ending.
 */
export function LessonTimerPage({ lessonClassId }: { lessonClassId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;

  const { data, isLoading, isError } = useLessonTimer(lessonClassId);
  const { data: classProfile } = useClassProfile(data?.classId ?? '');

  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [viewReportOpen, setViewReportOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

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
  const refreshTimer = () => {
    qc.invalidateQueries({ queryKey: qk.lessonTimer(lessonClassId) });
    qc.invalidateQueries({
      predicate: (q) => ['my-lessons', 'class-lessons', 'institute-lessons'].includes(q.queryKey[0] as string),
    });
  };

  if (isLoading) return <ListSkeleton />;
  if (isError || !data) return <EmptyState icon={BookOpen} title={t('timerNotFound')} />;

  const title = data.kind === 'recitation' ? t('recitation') : (data.name ?? t('lesson'));
  const expected = data.expectedDurationMinutes;
  const expectedSeconds = expected != null ? expected * 60 : null;
  const remainingSeconds = expectedSeconds != null ? expectedSeconds - elapsedSeconds : null;
  const progress =
    expectedSeconds && expectedSeconds > 0
      ? Math.min(100, (elapsedSeconds / expectedSeconds) * 100)
      : null;
  const overExpected = expectedSeconds != null && elapsedSeconds > expectedSeconds;

  // Visual warning states requested by user:
  // 1. Subtle ambient flash/glow before lesson ends (final 5 minutes):
  const isNearEnd =
    data.status === 'started' &&
    expectedSeconds != null &&
    remainingSeconds !== null &&
    remainingSeconds <= 300 &&
    remainingSeconds > 0;

  // 2. Pronounced, larger ambient flash/glow when lesson time has ended:
  const isTimeUp = data.status === 'started' && overExpected;

  async function start() {
    setBusy(true);
    try {
      await startLesson(lessonClassId);
      setNow(Date.now());
      refreshTimer();
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const studentsRoster =
    classProfile?.students?.map((s) => ({
      id: s.id,
      name: s.name,
      isIntensive: s.isIntensive,
    })) ?? [];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {/* Subtle ambient flash overlay before lesson ends (وميض بلون خافت) */}
      {isNearEnd && (
        <div
          className="fixed inset-0 pointer-events-none z-30 ring-inset ring-4 ring-amber-500/20 animate-pulse duration-1000"
          aria-hidden="true"
        />
      )}

      {/* Pronounced ambient flash overlay when lesson time ends (وميض أكبر) */}
      {isTimeUp && (
        <div
          className="fixed inset-0 pointer-events-none z-30 ring-inset ring-8 ring-rose-500/35 animate-pulse duration-700"
          aria-hidden="true"
        />
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={back} aria-label={t('back')}>
          <Back className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">{t('lessonTimer')}</h1>
      </div>

      <Card
        className={`transition-all duration-500 ${
          isTimeUp
            ? 'border-rose-500/80 ring-2 ring-rose-500/40 shadow-[0_0_35px_rgba(239,68,68,0.25)] animate-pulse'
            : isNearEnd
            ? 'border-amber-500/60 ring-2 ring-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
            : ''
        }`}
      >
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

          {/* Subtle warning before end */}
          {isNearEnd && remainingSeconds != null && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 animate-pulse">
              <span>⏳ {t('nearEndWarning')}</span>
              <span className="font-mono font-bold" dir="ltr">
                ({Math.max(1, Math.ceil(remainingSeconds / 60))} دقيقة)
              </span>
            </div>
          )}

          {/* Pronounced warning when time is up */}
          {isTimeUp && expectedSeconds != null && (
            <div className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 animate-pulse">
              <span>⚠️ {t('timeUpWarning')}</span>
              <span className="font-mono" dir="ltr">
                (+{Math.floor((elapsedSeconds - expectedSeconds) / 60)} دقيقة)
              </span>
            </div>
          )}

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
              <Button
                size="lg"
                className="w-full gap-2 font-semibold"
                disabled={busy}
                onClick={() => setReportDialogOpen(true)}
              >
                <FileText className="size-4" />
                {t('endLessonAndWriteReport')}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/dashboard')}
              >
                <LayoutDashboard className="size-3.5" />
                {t('workInBackground')}
              </Button>
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
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={() => setViewReportOpen(true)}
              >
                <FileText className="size-4" />
                {t('viewLessonReport')}
              </Button>
              <Button variant="secondary" className="w-full" onClick={back}>
                {t('back')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lesson description & attached learning sources */}
      {((data.sources && data.sources.length > 0) || data.description) && (
        <Card className="border-primary/20">
          <CardContent className="flex flex-col gap-3 py-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <FileText className="size-3.5 text-primary" />
                {t('sourcesAndMaterials')}
              </span>
              {data.sources && data.sources.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-medium">
                  {t('attachedSources', { n: data.sources.length })}
                </span>
              )}
            </div>

            {data.description && (
              <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border leading-relaxed">
                {data.description}
              </p>
            )}

            {data.sources && data.sources.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.sources.map((s, idx) => {
                  const isPdf = s.kind === 'pdf';
                  const isImg = s.kind === 'image';
                  const isLink = s.kind === 'link';
                  const href = resolveAsset(s.url) ?? s.url;
                  return (
                    <a
                      key={idx}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:border-primary/50 transition shadow-sm"
                    >
                      {isPdf && <FileText className="size-3.5 text-rose-500 shrink-0" />}
                      {isImg && <ImageIcon className="size-3.5 text-emerald-500 shrink-0" />}
                      {isLink && <ExternalLink className="size-3.5 text-sky-500 shrink-0" />}
                      <span className="max-w-[180px] truncate">{s.description || s.url}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick multitasking / in-lesson shortcuts */}
      {data.status === 'started' && data.classId && (
        <Card className="border-primary/20 bg-muted/20">
          <CardContent className="flex flex-col gap-2.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" />
                {t('multitaskTitle')}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {t('workInBackgroundHint')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs justify-center px-2"
                onClick={() => setAttendanceOpen(true)}
              >
                <ClipboardCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{t('quickAttendance')}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs justify-center px-2"
                onClick={() => router.push(`/dashboard/classes/${data.classId}`)}
              >
                <Users className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{t('quickClassProfile')}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs justify-center px-2"
                onClick={() => router.push('/dashboard')}
              >
                <LayoutDashboard className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="truncate">{t('workInBackground')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dinar options for students during lesson execution */}
      {data.status === 'started' && data.instituteId && data.classId && (
        <>
          <LessonTimerDinars instituteId={data.instituteId} classId={data.classId} />
          <LessonTimerNotes instituteId={data.instituteId} classId={data.classId} />
        </>
      )}

      {/* Quick Attendance modal when triggered during lesson */}
      {data.classId && attendanceOpen && (
        <TakeAttendanceDialog
          classId={data.classId}
          roster={studentsRoster}
          open={attendanceOpen}
          onOpenChange={setAttendanceOpen}
          onDone={() => {
            setAttendanceOpen(false);
            if (data.classId) {
              qc.invalidateQueries({ queryKey: qk.classAttendance(data.classId) });
            }
          }}
          withTrigger={false}
        />
      )}

      {/* Lesson Report Dialog on End */}
      <LessonReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        lessonClassId={lessonClassId}
        lessonTitle={title}
        className={data.className}
        onSuccess={() => {
          qc.invalidateQueries({
            predicate: (q) =>
              ['my-lessons', 'class-lessons', 'institute-lessons', 'lesson-report'].includes(
                q.queryKey[0] as string,
              ),
          });
          back();
        }}
      />

      {/* Lesson Report View Dialog */}
      <LessonReportViewDialog
        open={viewReportOpen}
        onOpenChange={setViewReportOpen}
        lessonClassId={lessonClassId}
      />
    </div>
  );
}
