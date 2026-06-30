'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, BookMarked, Check } from 'lucide-react';
import type {
  LessonCategory,
  LessonKind,
  LessonSourceInput,
} from '@/lib/types';
import { createLesson, updateLesson, ApiError } from '@/lib/api';
import { useClasses, useTeachers, useManagers } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils';
import { LessonSourcesEditor } from './lesson-sources-editor';

export interface LessonEditing {
  lessonId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  categoryId: string | null;
  date: string;
  sources: LessonSourceInput[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Create or edit a lesson. Create supports scheduling to multiple classes with a
 * teacher per class and a recitation kind; edit changes shared content only
 * (assignments are managed from the program to avoid clobbering other classes).
 */
export function AddLessonDialog({
  instituteId,
  categories,
  open,
  onOpenChange,
  onDone,
  preselectClassId,
  preselectDate,
  editing,
}: {
  instituteId: string;
  categories: LessonCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  preselectClassId?: string;
  preselectDate?: string;
  editing?: LessonEditing | null;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const isEdit = !!editing;

  const { data: classes = [] } = useClasses(instituteId);
  const { data: teachers = [] } = useTeachers(instituteId);
  const { data: managers = [] } = useManagers(instituteId);
  const candidateTeachers = useMemo(
    () =>
      [
        ...teachers.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })),
        ...managers.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName} (${t('teacher')})` })),
      ],
    [teachers, managers, t],
  );

  const [kind, setKind] = useState<LessonKind>('lesson');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState(todayISO());
  const [sources, setSources] = useState<LessonSourceInput[]>([]);
  const [assign, setAssign] = useState<Record<string, string>>({}); // classId -> teacherId
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setKind(editing.kind);
      setName(editing.name ?? '');
      setDescription(editing.description ?? '');
      setCategoryId(editing.categoryId ?? '');
      setDate(editing.date);
      setSources(editing.sources);
      setAssign({});
    } else {
      setKind('lesson');
      setName('');
      setDescription('');
      setCategoryId('');
      setDate(preselectDate ?? todayISO());
      setSources([]);
      setAssign(preselectClassId ? { [preselectClassId]: '' } : {});
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isLesson = kind === 'lesson';

  function toggleClass(classId: string, checked: boolean) {
    setAssign((prev) => {
      const next = { ...prev };
      if (checked) next[classId] = next[classId] ?? '';
      else delete next[classId];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isLesson && !name.trim()) return setError(t('name'));

    if (!isEdit) {
      const entries = Object.entries(assign);
      if (entries.length === 0) return setError(t('selectAtLeastOneClass'));
      if (entries.some(([, teacherId]) => !teacherId)) return setError(t('assignTeacherEach'));
    }

    setBusy(true);
    try {
      if (isEdit) {
        await updateLesson(editing!.lessonId, {
          name: isLesson ? name.trim() : undefined,
          description: isLesson ? description || undefined : undefined,
          categoryId: isLesson ? categoryId || undefined : undefined,
          date,
          sources: isLesson ? sources : undefined,
        });
      } else {
        await createLesson(instituteId, {
          kind,
          name: isLesson ? name.trim() : undefined,
          description: isLesson ? description || undefined : undefined,
          categoryId: isLesson && categoryId ? categoryId : undefined,
          date,
          sources: isLesson ? sources : undefined,
          assignments: Object.entries(assign).map(([classId, teacherId]) => ({ classId, teacherId })),
        });
      }
      onOpenChange(false);
      onDone();
      notify.success(isEdit ? t('editLesson') : t('addLesson'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editLesson') : t('addLesson')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {/* Kind switch (create only) */}
          {!isEdit && (
            <div className="grid grid-cols-2 gap-2">
              <KindButton active={kind === 'lesson'} onClick={() => setKind('lesson')} icon={<BookOpen className="size-4" />} label={t('lesson')} />
              <KindButton active={kind === 'recitation'} onClick={() => setKind('recitation')} icon={<BookMarked className="size-4" />} label={t('recitation')} />
            </div>
          )}

          {isLesson && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lsn-name">{t('name')}</Label>
                <Input id="lsn-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lsn-desc">{t('description')}</Label>
                <Input id="lsn-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('category')}</Label>
                <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('noCategory')}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lsn-date">{t('date')}</Label>
            <Input id="lsn-date" type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {isLesson && <LessonSourcesEditor value={sources} onChange={setSources} />}

          {/* Multi-class assignment (create only) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('perClassTeacher')}</Label>
              <div className="flex flex-col gap-1.5">
                {classes.map((c) => {
                  const selected = c.id in assign;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        'flex flex-col gap-1.5 rounded-md border p-2 transition',
                        selected ? 'border-primary bg-primary/5' : 'border-border',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleClass(c.id, !selected)}
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        <span
                          className={cn(
                            'grid size-4 shrink-0 place-items-center rounded border',
                            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                          )}
                        >
                          {selected && <Check className="size-3" />}
                        </span>
                        {c.name}
                      </button>
                      {selected && (
                        <Select
                          value={assign[c.id] || ''}
                          onValueChange={(v) => setAssign((p) => ({ ...p, [c.id]: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t('selectTeacher')} />
                          </SelectTrigger>
                          <SelectContent>
                            {candidateTeachers.map((te) => (
                              <SelectItem key={te.id} value={te.id}>
                                {te.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? tc('loading') : tc('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KindButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
