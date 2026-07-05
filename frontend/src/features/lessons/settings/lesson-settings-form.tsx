'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateLessonSettings } from '@/lib/api';
import { useLessonSettings, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/features/shared/skeletons';
import { CategoryManager } from '../category-manager';

/**
 * Lesson settings for an institute (spec 009): the duration threshold and the
 * over/under-time evaluation toggle, plus category management composed from the
 * existing manager (no duplication — constitution V).
 */
export function LessonSettingsForm({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const { data, isLoading } = useLessonSettings(instituteId);

  const [threshold, setThreshold] = useState('10');
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setThreshold(data.durationThresholdMinutes.toString());
    setEnabled(data.durationStatusEnabled);
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
    <div className="flex max-w-xl flex-col gap-4">
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

          <Button onClick={save} disabled={busy} className="self-start">
            {busy ? tc('loading') : tc('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Category management (composed, moved from the hub toolbar) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('categories')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryManager instituteId={instituteId} />
        </CardContent>
      </Card>
    </div>
  );
}
