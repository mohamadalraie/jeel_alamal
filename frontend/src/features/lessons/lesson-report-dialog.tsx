'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import { submitLessonReport } from '@/lib/api';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function LessonReportDialog({
  open,
  onOpenChange,
  lessonClassId,
  lessonTitle,
  className,
  initialNotes = '',
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonClassId: string;
  lessonTitle: string;
  className: string;
  initialNotes?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');

  const [mainIdeas, setMainIdeas] = useState('');
  const [positives, setPositives] = useState('');
  const [negatives, setNegatives] = useState('');
  const [teacherNotes, setTeacherNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);

  // Word count & quality evaluation
  const mainWords = useMemo(() => {
    const text = mainIdeas.trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [mainIdeas]);

  const qualityInfo = useMemo(() => {
    if (mainWords === 0) {
      return {
        level: 'empty',
        label: '',
        hint: '',
        percent: 0,
        badgeClass: 'text-muted-foreground bg-muted',
        barClass: 'bg-muted',
      };
    }
    if (mainWords < 5) {
      return {
        level: 'low',
        label: t('reportQualityLow'),
        hint: t('reportQualityLowHint'),
        percent: Math.max(15, Math.min(35, mainWords * 8)),
        badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
        barClass: 'bg-amber-500',
      };
    }
    if (mainWords < 14) {
      return {
        level: 'good',
        label: t('reportQualityGood'),
        hint: t('reportQualityGoodHint'),
        percent: Math.min(80, 40 + (mainWords - 5) * 5),
        badgeClass: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30',
        barClass: 'bg-sky-500',
      };
    }
    return {
      level: 'excellent',
      label: t('reportQualityExcellent'),
      hint: t('reportQualityExcellentHint'),
      percent: 100,
      badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      barClass: 'bg-emerald-500',
    };
  }, [mainWords, t]);

  async function handleSubmit() {
    if (!mainIdeas.trim()) {
      notify.error(t('mainIdeasRequired'));
      return;
    }

    if (mainWords < 4) {
      notify.warning(t('reportTooShortWarning'));
      return;
    }

    setBusy(true);
    try {
      const res = await submitLessonReport(lessonClassId, {
        mainIdeas: mainIdeas.trim(),
        positives: positives.trim() || undefined,
        negatives: negatives.trim() || undefined,
        teacherNotes: teacherNotes.trim() || undefined,
      });

      if (res.webhookStatus === 'sent') {
        notify.success(t('reportSubmittedAndSentWhatsapp'));
      } else if (res.webhookStatus === 'failed') {
        notify.warning(t('reportSubmittedWhatsappFailed'));
      } else {
        notify.success(t('reportSubmittedSuccess'));
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileText className="text-primary size-5" />
            {t('lessonReportDialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {lessonTitle} • {className}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Main Ideas (Required) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="main-ideas" className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="text-primary size-4" />
              {t('mainIdeasLabel')} <span className="text-destructive">*</span>
            </Label>
            <p className="text-muted-foreground text-xs">{t('mainIdeasHint')}</p>
            <Textarea
              id="main-ideas"
              value={mainIdeas}
              onChange={(e) => setMainIdeas(e.target.value)}
              placeholder={t('mainIdeasPlaceholder')}
              rows={3}
              autoFocus
            />

            {/* Smart Word Counter & Quality Meter */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {t('wordCount')}: <strong className="text-foreground">{mainWords}</strong>
                  </span>
                  {qualityInfo.label && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${qualityInfo.badgeClass}`}
                    >
                      {qualityInfo.level === 'excellent' && <Sparkles className="size-3" />}
                      {qualityInfo.level === 'low' && <AlertCircle className="size-3" />}
                      {qualityInfo.level === 'good' && <Check className="size-3" />}
                      <span>{qualityInfo.label}</span>
                    </span>
                  )}
                </div>
                {qualityInfo.percent > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {qualityInfo.percent}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${qualityInfo.barClass}`}
                  style={{ width: `${qualityInfo.percent}%` }}
                />
              </div>

              {qualityInfo.hint && (
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {qualityInfo.hint}
                </p>
              )}
            </div>
          </div>

          {/* Positives (Optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="positives" className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <ThumbsUp className="size-4" />
              {t('positivesLabel')}
            </Label>
            <Textarea
              id="positives"
              value={positives}
              onChange={(e) => setPositives(e.target.value)}
              placeholder={t('positivesPlaceholder')}
              rows={2}
            />
          </div>

          {/* Negatives / Challenges (Optional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="negatives" className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <ThumbsDown className="size-4" />
              {t('negativesLabel')}
            </Label>
            <Textarea
              id="negatives"
              value={negatives}
              onChange={(e) => setNegatives(e.target.value)}
              placeholder={t('negativesPlaceholder')}
              rows={2}
            />
          </div>

          {/* Teacher session notes (Internal) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-notes" className="text-muted-foreground text-xs font-medium">
              {t('teacherNotesLabel')}
            </Label>
            <Textarea
              id="session-notes"
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder={t('teacherNotesPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {tc('cancel')}
          </Button>

          <Button onClick={handleSubmit} disabled={busy} className="gap-2 font-semibold">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {tc('saving')}
              </>
            ) : (
              <>
                <FileText className="size-4" />
                {t('submitReportAndEndLesson')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
