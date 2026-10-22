'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';
import { useLessonReport, useQueryClient, qk } from '@/lib/queries';
import { retryLessonReportWebhook, updateLessonReport } from '@/lib/api';
import { notify } from '@/lib/toast';
import { LessonReportDialog } from './lesson-report-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function LessonReportViewDialog({
  open,
  onOpenChange,
  lessonClassId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonClassId: string | null;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const { data: report, isLoading, isError } = useLessonReport(
    lessonClassId ?? undefined,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editMainIdeas, setEditMainIdeas] = useState('');
  const [editPositives, setEditPositives] = useState('');
  const [editNegatives, setEditNegatives] = useState('');
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [createReportOpen, setCreateReportOpen] = useState(false);

  if (!lessonClassId) return null;

  function handleStartEdit() {
    if (!report) return;
    setEditMainIdeas(report.mainIdeas);
    setEditPositives(report.positives ?? '');
    setEditNegatives(report.negatives ?? '');
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!editMainIdeas.trim()) {
      notify.error(t('mainIdeasRequired'));
      return;
    }

    setBusy(true);
    try {
      await updateLessonReport(lessonClassId!, {
        mainIdeas: editMainIdeas.trim(),
        positives: editPositives.trim() || undefined,
        negatives: editNegatives.trim() || undefined,
      });

      notify.success(tc('saveSuccess'));
      await qc.invalidateQueries({
        queryKey: qk.lessonReport(lessonClassId!),
      });
      setIsEditing(false);
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryWebhook() {
    setRetrying(true);
    try {
      const res = await retryLessonReportWebhook(lessonClassId!);
      if (res.success) {
        notify.success(t('webhookRetrySuccess'));
      } else {
        notify.error(res.error ?? t('webhookRetryFailed'));
      }
      await qc.invalidateQueries({
        queryKey: qk.lessonReport(lessonClassId!),
      });
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileText className="text-primary size-5" />
                {t('lessonReportViewTitle')}
              </DialogTitle>
              {report && (
                <p className="text-muted-foreground text-xs mt-1">
                  {report.lessonTitle} • {report.className}
                </p>
              )}
            </div>

            {report && report.canEdit && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="h-8 gap-1.5 text-xs"
              >
                <Edit2 className="size-3.5" />
                {tc('edit')}
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-primary size-6 animate-spin" />
          </div>
        ) : isError || !report ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="rounded-full bg-muted/60 p-3 text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              لم يتم تسجيل تقرير لهذا الدرس حتى الآن.
            </p>
            <Button
              size="sm"
              onClick={() => setCreateReportOpen(true)}
              className="gap-2 font-semibold"
            >
              <Plus className="size-4" />
              <span>كتابة تقرير الدرس الآن</span>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* Header info card */}
            <div className="bg-muted/30 border-border flex flex-wrap items-center gap-3 rounded-lg border p-3 text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="text-muted-foreground size-3.5" />
                {report.date}
              </span>
              {report.actualDurationMinutes != null && (
                <span className="flex items-center gap-1">
                  <Clock className="text-muted-foreground size-3.5" />
                  {report.actualDurationMinutes} {t('minutesAbbr')}
                </span>
              )}
              {report.teacherName && (
                <span className="flex items-center gap-1">
                  <User className="text-muted-foreground size-3.5" />
                  {report.teacherName}
                </span>
              )}

              {/* Webhook Status Badge */}
              <div className="ltr:ml-auto rtl:mr-auto">
                {report.webhookStatus === 'sent' && (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1">
                    <CheckCircle2 className="size-3" />
                    {t('webhookStatusSent')}
                  </Badge>
                )}
                {report.webhookStatus === 'failed' && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="size-3" />
                    {t('webhookStatusFailed')}
                  </Badge>
                )}
                {report.webhookStatus === 'pending' && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    {t('webhookStatusPending')}
                  </Badge>
                )}
                {report.webhookStatus === 'disabled' && (
                  <Badge variant="secondary" className="gap-1 text-[11px] opacity-75">
                    الواتساب غير مفعّل
                  </Badge>
                )}
              </div>
            </div>

            {/* If webhook failed or disabled, show dispatch/retry prompt for authorized staff */}
            {report.canEdit && report.webhookStatus !== 'sent' && (
              <div className="bg-amber-500/10 border-amber-500/30 flex items-center justify-between rounded-lg border p-2.5 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {report.webhookStatus === 'failed' ? t('webhookFailedTitle') : 'إرسال التقرير إلى واتساب (n8n)'}
                  </span>
                  <span className="text-[11px] opacity-90">
                    {report.webhookError || (report.webhookStatus === 'failed' ? t('webhookFailedHint') : 'يمكنك إرسال هذا التقرير الآن إلى أولياء الأمور عبر الواتساب')}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryWebhook}
                  disabled={retrying}
                  className="h-8 shrink-0 gap-1.5 border-amber-500/40 text-xs font-semibold bg-background hover:bg-amber-500/10 text-amber-900 dark:text-amber-100 cursor-pointer"
                >
                  {retrying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>{report.webhookStatus === 'failed' ? t('retryWebhook') : 'إرسال إلى واتساب'}</span>
                </Button>
              </div>
            )}

            {isEditing ? (
              <div className="flex flex-col gap-3 py-1">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold">
                    {t('mainIdeasLabel')} *
                  </Label>
                  <Textarea
                    value={editMainIdeas}
                    onChange={(e) => setEditMainIdeas(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {t('positivesLabel')}
                  </Label>
                  <Textarea
                    value={editPositives}
                    onChange={(e) => setEditPositives(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {t('negativesLabel')}
                  </Label>
                  <Textarea
                    value={editNegatives}
                    onChange={(e) => setEditNegatives(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={busy}
                  >
                    {tc('cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={busy || !editMainIdeas.trim()}
                  >
                    {busy && <Loader2 className="size-3.5 animate-spin ltr:mr-1 rtl:ml-1" />}
                    {tc('save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Main Ideas */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-primary flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="size-3.5" />
                    {t('mainIdeasLabel')}
                  </span>
                  <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap leading-relaxed">
                    {report.mainIdeas}
                  </div>
                </div>

                {/* Positives (Internal) */}
                {report.positives && (
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <ThumbsUp className="size-3.5" />
                      {t('positivesLabel')}
                    </span>
                    <div className="bg-emerald-500/5 border-emerald-500/20 rounded-lg border p-3 text-sm whitespace-pre-wrap leading-relaxed">
                      {report.positives}
                    </div>
                  </div>
                )}

                {/* Negatives (Internal) */}
                {report.negatives && (
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <ThumbsDown className="size-3.5" />
                      {t('negativesLabel')}
                    </span>
                    <div className="bg-amber-500/5 border-amber-500/20 rounded-lg border p-3 text-sm whitespace-pre-wrap leading-relaxed">
                      {report.negatives}
                    </div>
                  </div>
                )}

                {/* Teacher notes (Internal) */}
                {report.teacherNotes && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      {t('teacherNotesLabel')}
                    </span>
                    <div className="bg-muted/20 border-border rounded-lg border p-2.5 text-xs text-muted-foreground whitespace-pre-wrap">
                      {report.teacherNotes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tc('close')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {createReportOpen && (
        <LessonReportDialog
          open={createReportOpen}
          onOpenChange={setCreateReportOpen}
          lessonClassId={lessonClassId}
          lessonTitle={report?.lessonTitle || t('lesson')}
          className={report?.className || ''}
          onSuccess={() => {
            qc.invalidateQueries({
              queryKey: qk.lessonReport(lessonClassId),
            });
            qc.invalidateQueries({
              predicate: (q) =>
                ['my-lessons', 'class-lessons', 'institute-lessons'].includes(
                  q.queryKey[0] as string,
                ),
            });
          }}
        />
      )}
    </Dialog>
  );
}
