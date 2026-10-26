'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Loader2, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
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

  const appendOrSet = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    phrase: string,
  ) => {
    setter((prev) => {
      const clean = prev.trim();
      if (!clean) return phrase;
      if (clean.includes(phrase)) return clean;
      return `${clean}، و${phrase}`;
    });
  };

  async function handleSubmit() {
    if (!mainIdeas.trim()) {
      notify.error(t('mainIdeasRequired'));
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
            {/* Quick Templates for Main Ideas */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => appendOrSet(setMainIdeas, t('templateMainIdeas1'))}
                className="rounded-md border border-border bg-accent/40 hover:bg-primary/10 hover:border-primary/40 px-2 py-0.5 text-[11px] text-foreground transition text-start"
              >
                + {t('templateMainIdeas1')}
              </button>
              <button
                type="button"
                onClick={() => appendOrSet(setMainIdeas, t('templateMainIdeas2'))}
                className="rounded-md border border-border bg-accent/40 hover:bg-primary/10 hover:border-primary/40 px-2 py-0.5 text-[11px] text-foreground transition text-start"
              >
                + {t('templateMainIdeas2')}
              </button>
              <button
                type="button"
                onClick={() => appendOrSet(setMainIdeas, t('templateMainIdeas3'))}
                className="rounded-md border border-border bg-accent/40 hover:bg-primary/10 hover:border-primary/40 px-2 py-0.5 text-[11px] text-foreground transition text-start"
              >
                + {t('templateMainIdeas3')}
              </button>
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
            {/* Quick Templates for Positives */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => appendOrSet(setPositives, t('templatePositives1'))}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 transition text-start"
              >
                + {t('templatePositives1')}
              </button>
              <button
                type="button"
                onClick={() => appendOrSet(setPositives, t('templatePositives2'))}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 transition text-start"
              >
                + {t('templatePositives2')}
              </button>
            </div>
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
            {/* Quick Templates for Negatives */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => appendOrSet(setNegatives, t('templateNegatives1'))}
                className="rounded-md border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400 transition text-start"
              >
                + {t('templateNegatives1')}
              </button>
              <button
                type="button"
                onClick={() => appendOrSet(setNegatives, t('templateNegatives2'))}
                className="rounded-md border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400 transition text-start"
              >
                + {t('templateNegatives2')}
              </button>
            </div>
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

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !mainIdeas.trim()}
          >
            {busy && <Loader2 className="size-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t('submitReportAndEndLesson')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
