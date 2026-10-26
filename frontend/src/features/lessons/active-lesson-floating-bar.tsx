'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useMyLessons, useQueryClient } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { LessonReportDialog } from './lesson-report-dialog';
import type { TeacherLessonEntry } from '@/lib/types';

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
 * Floating bar that appears anywhere in the dashboard when a teacher has an active
 * running lesson (status === 'started').
 *
 * Allows the teacher to freely multitask and navigate anywhere in the app,
 * while keeping live track of lesson elapsed time and providing 1-click return
 * or end-and-report shortcuts.
 */
export function ActiveLessonFloatingBar() {
  const t = useTranslations('lessons');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { selected, user } = useInstitute();

  const isEligible = user?.role !== 'student';

  // Poll every 15s to keep lessons state fresh across navigation
  const { data: lessonsData } = useMyLessons(selected?.id, isEligible);

  const activeLesson: TeacherLessonEntry | undefined = useMemo(() => {
    return lessonsData?.entries?.find((e) => e.status === 'started');
  }, [lessonsData]);

  const [minimized, setMinimized] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Check if teacher is currently already on this specific lesson's timer page
  const isOnTimerPage =
    activeLesson && pathname?.includes(`/lesson-timer/${activeLesson.lessonClassId}`);

  // Running timer ticker
  useEffect(() => {
    if (!activeLesson?.actualStartTime) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeLesson?.actualStartTime]);

  const elapsedSeconds = useMemo(() => {
    if (!activeLesson?.actualStartTime) return 0;
    return Math.max(0, (now - new Date(activeLesson.actualStartTime).getTime()) / 1000);
  }, [now, activeLesson?.actualStartTime]);

  // Sync elapsed time with browser tab title
  useEffect(() => {
    if (!activeLesson) return;
    const originalTitle = document.title;
    const lessonTitle = activeLesson.name || t('lesson');
    const elapsedStr = formatElapsed(elapsedSeconds);
    document.title = `⏱️ ${elapsedStr} - ${lessonTitle} | ${originalTitle.replace(/^⏱️.*?- /, '')}`;

    return () => {
      // Revert title when lesson ends or unmounts
      document.title = originalTitle.replace(/^⏱️.*?- /, '');
    };
  }, [activeLesson, elapsedSeconds, t]);

  // If there is no active lesson, or if user is currently already on the timer page, don't show the floating bar
  if (!activeLesson || isOnTimerPage) {
    return null;
  }

  const title =
    activeLesson.kind === 'recitation' ? t('recitation') : activeLesson.name ?? t('lesson');
  const expected = activeLesson.expectedDurationMinutes;
  const expectedSeconds = expected != null ? expected * 60 : null;
  const remainingSeconds = expectedSeconds != null ? expectedSeconds - elapsedSeconds : null;
  const overExpected = expectedSeconds != null && elapsedSeconds > expectedSeconds;
  const isNearEnd =
    expectedSeconds != null &&
    remainingSeconds !== null &&
    remainingSeconds <= 300 &&
    remainingSeconds > 0;
  const isTimeUp = overExpected;

  const progress =
    expectedSeconds && expectedSeconds > 0
      ? Math.min(100, (elapsedSeconds / expectedSeconds) * 100)
      : null;

  const goToTimer = () => {
    router.push(`/dashboard/lesson-timer/${activeLesson.lessonClassId}`);
  };

  const BackIcon = locale === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <>
      <div
        className="fixed bottom-5 end-4 sm:end-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
      >
        {minimized ? (
          // Compact Minimized Pill
          <div
            className={`bg-card/95 text-card-foreground flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-xl backdrop-blur-md transition-all duration-500 ${
              isTimeUp
                ? 'border-rose-500/80 ring-2 ring-rose-500/40 animate-pulse'
                : isNearEnd
                ? 'border-amber-500/70 ring-2 ring-amber-500/30'
                : 'border-primary/40'
            }`}
          >
            <span className="relative flex h-3 w-3 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  isTimeUp ? 'bg-rose-400' : isNearEnd ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isTimeUp ? 'bg-rose-500' : isNearEnd ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </span>

            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-sm font-bold tabular-nums ${
                  isTimeUp
                    ? 'text-destructive font-black'
                    : isNearEnd
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
                dir="ltr"
              >
                {formatElapsed(elapsedSeconds)}
              </span>
              <span className="text-muted-foreground text-xs">|</span>
              <span className="max-w-[120px] sm:max-w-[160px] truncate text-xs font-semibold">
                {title}
              </span>
            </div>

            <Button
              size="sm"
              variant={isTimeUp ? 'destructive' : 'default'}
              className="h-7 gap-1 px-2.5 text-xs font-medium shadow-sm"
              onClick={goToTimer}
            >
              <span>{t('returnToLesson')}</span>
              <BackIcon className="size-3" />
            </Button>

            <button
              type="button"
              onClick={() => setMinimized(false)}
              className="text-muted-foreground hover:text-foreground rounded p-1 transition"
              title={t('maximize')}
            >
              <ChevronUp className="size-4" />
            </button>
          </div>
        ) : (
          // Expanded Full Floating Dock
          <div
            className={`bg-card/95 text-card-foreground rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-md transition-all duration-500 ${
              isTimeUp
                ? 'border-rose-500/80 ring-2 ring-rose-500/40 shadow-[0_0_35px_rgba(239,68,68,0.25)] animate-pulse'
                : isNearEnd
                ? 'border-amber-500/70 ring-2 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'border-primary/30'
            }`}
          >
            {/* Top header row */}
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      isTimeUp ? 'bg-rose-400' : isNearEnd ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                      isTimeUp ? 'bg-rose-500' : isNearEnd ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </span>

                {isTimeUp ? (
                  <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 rounded-full px-2 py-0.5 text-[11px] font-bold">
                    ⚠️ {t('timeUpWarning')}
                  </span>
                ) : isNearEnd ? (
                  <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5 text-[11px] font-bold">
                    ⏳ {t('nearEndWarning')}
                  </span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[11px] font-bold">
                    {t('runningNow')}
                  </span>
                )}

                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-muted-foreground truncate text-xs font-medium">
                  {activeLesson.className}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent rounded p-1 transition"
                  title={t('minimize')}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>

            {/* Lesson Title & Timer */}
            <div className="my-3 flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-foreground">{title}</span>
                {expected != null && (
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Clock className="size-3" />
                    {t('expectedOf', { n: expected })}
                  </span>
                )}
              </div>

              <div
                className={`font-mono text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
                  overExpected ? 'text-destructive animate-pulse' : 'text-primary'
                }`}
                dir="ltr"
              >
                {formatElapsed(elapsedSeconds)}
              </div>
            </div>

            {/* Expected duration progress bar */}
            {progress !== null && (
              <div className="mb-3 bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overExpected ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                className="flex-1 gap-1.5 font-semibold text-xs shadow-md"
                onClick={goToTimer}
              >
                <ExternalLink className="size-3.5" />
                {t('returnToLesson')}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-medium"
                onClick={() => setReportDialogOpen(true)}
              >
                <FileText className="size-3.5" />
                {t('endLessonShort')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lesson Report Dialog if ended from floating dock */}
      <LessonReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        lessonClassId={activeLesson.lessonClassId}
        lessonTitle={title}
        className={activeLesson.className}
        onSuccess={() => {
          qc.invalidateQueries({
            predicate: (q) =>
              ['my-lessons', 'class-lessons', 'institute-lessons', 'lesson-report'].includes(
                q.queryKey[0] as string,
              ),
          });
        }}
      />
    </>
  );
}
