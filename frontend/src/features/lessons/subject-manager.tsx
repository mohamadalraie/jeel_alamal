'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import {
  createLessonSubject,
  archiveLessonSubject,
} from '@/lib/api';
import { useLessonSubjects, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { cn } from '@/lib/utils';
import { CATEGORY_PALETTE } from './lesson-colors';

/** Manager dialog to add/archive lesson subjects (المواد الدراسية). */
export function SubjectManager({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const { data: subjects = [] } = useLessonSubjects(instituteId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_PALETTE[1]);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: qk.lessonSubjects(instituteId) });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createLessonSubject(instituteId, { name: name.trim(), color });
      setName('');
      refresh();
      notify.success(t('addSubjectSuccess') || 'تمت إضافة المادة بنجاح');
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string) {
    try {
      await archiveLessonSubject(id);
      refresh();
      notify.success(t('archiveSubjectSuccess') || 'تمت أرشفة المادة');
    } catch (err) {
      notify.error(err, tc('error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen data-icon="inline-start" />
          {t('manageSubjects') || 'إدارة المواد'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('subjects') || 'المواد الدراسية'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-name">{t('subjectName') || 'اسم المادة'}</Label>
            <Input
              id="sub-name"
              placeholder="مثال: الفقه، السيرة، التفسير..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('color')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full ring-offset-2 transition',
                    color === c && 'ring-foreground ring-2',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            <Plus data-icon="inline-start" />
            {t('addSubject') || 'إضافة مادة جديدة'}
          </Button>
        </form>

        {subjects.length > 0 && (
          <ul className="flex flex-col divide-y max-h-60 overflow-y-auto">
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-sm">
                  {s.color && (
                    <span className="size-3.5 rounded-full" style={{ backgroundColor: s.color }} />
                  )}
                  {s.name}
                </span>
                <ConfirmDialog
                  title={t('archiveSubject') || 'أرشفة المادة'}
                  message={t('archiveSubjectMsg') || 'هل أنت تأكد من أرشفة هذه المادة؟'}
                  onConfirm={() => archive(s.id)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={t('archiveSubject') || 'أرشفة'}>
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
