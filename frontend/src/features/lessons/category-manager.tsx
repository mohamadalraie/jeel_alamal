'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Tags, Trash2 } from 'lucide-react';
import {
  createLessonCategory,
  deleteLessonCategory,
} from '@/lib/api';
import { useLessonCategories, useQueryClient, qk } from '@/lib/queries';
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

/** Manager dialog to add/remove lesson categories (name + color). Spec 008. */
export function CategoryManager({ instituteId }: { instituteId: string }) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const { data: categories = [] } = useLessonCategories(instituteId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_PALETTE[0]);
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: qk.lessonCategories(instituteId) });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createLessonCategory(instituteId, { name: name.trim(), color });
      setName('');
      refresh();
      notify.success(t('addCategory'));
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteLessonCategory(id);
      refresh();
      notify.success(t('deleteCategory'));
    } catch (err) {
      notify.error(err, tc('error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags data-icon="inline-start" />
          {t('manageCategories')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('categories')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name">{t('categoryName')}</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
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
            {t('addCategory')}
          </Button>
        </form>

        {categories.length > 0 && (
          <ul className="flex flex-col divide-y">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-sm">
                  <span className="size-3.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
                <ConfirmDialog
                  title={t('deleteCategory')}
                  message={t('deleteCategoryMsg')}
                  onConfirm={() => remove(c.id)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={t('deleteCategory')}>
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
