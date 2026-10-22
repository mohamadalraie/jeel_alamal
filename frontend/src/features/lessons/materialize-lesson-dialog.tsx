'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { BookOpen, Calendar, Clock, Loader2, Play } from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { materializeScheduledLesson } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useQueryClient, qk, useLessonCategories } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const todayISO = () => new Date().toISOString().slice(0, 10);

export function MaterializeLessonDialog({
  open,
  onOpenChange,
  slot,
  instituteId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: ProgramEntry | null;
  instituteId?: string;
  onDone?: () => void;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [duration, setDuration] = useState<number>(
    slot?.expectedDurationMinutes ?? 45,
  );
  const [busy, setBusy] = useState(false);

  const { data: categories = [] } = useLessonCategories(instituteId);

  if (!slot) return null;

  const today = todayISO();
  const canStartNow = slot.date <= today;

  async function handleSubmit(startImmediately: boolean) {
    if (!slot) return;
    if (!name.trim() && slot.kind !== 'recitation') {
      notify.error(t('nameRequired'));
      return;
    }

    setBusy(true);
    try {
      const res = await materializeScheduledLesson({
        classId: slot.classId || '',
        date: slot.date,
        scheduleSlotId: slot.scheduleSlotId ?? undefined,
        kind: slot.kind,
        name: name.trim() || undefined,
        subjectId: slot.subjectId ?? undefined,
        categoryId: categoryId || slot.category?.id || undefined,
        description: description.trim() || undefined,
        expectedDurationMinutes: duration > 0 ? duration : undefined,
        startImmediately,
      });

      notify.success(t('materializeSuccess'));
      await qc.invalidateQueries({
        predicate: (q) =>
          ['my-lessons', 'class-lessons', 'institute-lessons'].includes(
            q.queryKey[0] as string,
          ),
      });

      onOpenChange(false);
      onDone?.();

      if (startImmediately) {
        router.push(`/dashboard/lesson-timer/${res.lessonClassId}`);
      }
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <BookOpen className="text-primary size-5" />
            {t('materializeTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Slot Metadata Badge */}
          <div className="bg-muted/40 border-border flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
            <div className="font-semibold">{slot.className}</div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {slot.date}
              </span>
              {slot.startTime && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {slot.startTime.value}
                </span>
              )}
              {slot.subjectName && (
                <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">
                  {slot.subjectName}
                </span>
              )}
            </div>
          </div>

          {/* Lesson Title */}
          {slot.kind !== 'recitation' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lesson-name" className="text-sm font-medium">
                {t('lessonName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lesson-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('lessonNamePlaceholder')}
                autoFocus
              />
            </div>
          )}

          {/* Category */}
          {categories.length > 0 && slot.kind !== 'recitation' && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">{t('category')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration" className="text-sm font-medium">
              {t('expectedDurationLabel')}
            </Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={180}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-sm font-medium">
              {t('description')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {tc('cancel')}
          </Button>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={busy}
            >
              {busy && <Loader2 className="size-4 animate-spin ltr:mr-2 rtl:ml-2" />}
              {t('materializeOnly')}
            </Button>

            {canStartNow && (
              <Button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin ltr:mr-2 rtl:ml-2" />
                ) : (
                  <Play className="size-4 ltr:mr-1.5 rtl:ml-1.5" />
                )}
                {t('materializeAndStart')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
