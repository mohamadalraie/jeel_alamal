'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateLessonSettings } from '@/lib/api';
import { useLessonSettings, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { CategoryManager } from '../category-manager';
import { SubjectManager } from '../subject-manager';
import { MessageSquareShare } from 'lucide-react';

/**
 * Lesson settings for an institute (spec 009 & 012):
 * - Duration threshold & over/under-time evaluation toggle.
 * - n8n WhatsApp Webhook integration settings (URL, Secret, Toggle).
 * - Category and Subject management.
 */
export function LessonSettingsForm({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const { data, isLoading } = useLessonSettings(instituteId);

  const [threshold, setThreshold] = useState('10');
  const [enabled, setEnabled] = useState(true);

  // Webhook settings
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setThreshold(data.durationThresholdMinutes.toString());
    setEnabled(data.durationStatusEnabled);
    setWebhookUrl(data.webhookUrl ?? '');
    setWebhookSecret(data.webhookSecret ?? '');
    setWebhookEnabled(data.webhookEnabled ?? false);
  }, [data]);

  if (isLoading || !data) return <ListSkeleton />;

  async function save() {
    const parsed = Number(threshold);
    const value =
      Number.isFinite(parsed) && parsed >= 0 ? Math.min(120, Math.floor(parsed)) : 0;
    setBusy(true);
    try {
      await updateLessonSettings(instituteId, {
        durationThresholdMinutes: value,
        durationStatusEnabled: enabled,
        webhookUrl: webhookUrl.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
        webhookEnabled,
      });
      await qc.invalidateQueries({ queryKey: qk.lessonSettings(instituteId) });
      notify.success(t('settingsSaved'));
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      {/* Duration Evaluation Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('durationEvaluation')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Enable/disable over/under-time evaluation */}
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className="border-border hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t('durationStatusEnabled')}</span>
              <span className="text-muted-foreground text-xs">{t('durationStatusHint')}</span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                enabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
                  enabled ? 'start-[1.375rem]' : 'start-0.5'
                }`}
              />
            </span>
          </button>

          {/* Threshold */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="threshold">{t('durationThreshold')}</Label>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={120}
              dir="ltr"
              inputMode="numeric"
              value={threshold}
              disabled={!enabled}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <span className="text-muted-foreground text-xs">{t('durationThresholdHint')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Webhook WhatsApp (n8n) Integration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareShare className="text-primary size-5" />
            {t('webhookSettingsTitle')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('webhookSettingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Enable/disable Webhook */}
          <button
            type="button"
            onClick={() => setWebhookEnabled((v) => !v)}
            className="border-border hover:bg-muted/50 flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t('webhookEnabledLabel')}</span>
              <span className="text-muted-foreground text-xs">{t('webhookEnabledHint')}</span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                webhookEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
                  webhookEnabled ? 'start-[1.375rem]' : 'start-0.5'
                }`}
              />
            </span>
          </button>

          {/* Webhook URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook-url">{t('webhookUrlLabel')}</Label>
            <Input
              id="webhook-url"
              type="url"
              dir="ltr"
              placeholder="https://n8n.your-domain.com/webhook/lesson-report"
              value={webhookUrl}
              disabled={!webhookEnabled}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <span className="text-muted-foreground text-xs">{t('webhookUrlHint')}</span>
          </div>

          {/* Webhook Secret */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook-secret">{t('webhookSecretLabel')}</Label>
            <Input
              id="webhook-secret"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              value={webhookSecret}
              disabled={!webhookEnabled}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <span className="text-muted-foreground text-xs">{t('webhookSecretHint')}</span>
          </div>

          <Button onClick={save} disabled={busy} className="self-start mt-2">
            {busy ? tc('loading') : tc('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Category and Subject management */}
      <Card>
        <CardHeader>
          <CardTitle>التصنيفات والمواد الدراسية</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <CategoryManager instituteId={instituteId} />
          <SubjectManager instituteId={instituteId} />
        </CardContent>
      </Card>
    </div>
  );
}
