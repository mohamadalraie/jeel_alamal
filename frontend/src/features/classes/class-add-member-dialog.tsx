'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import {
  createTeacher,
  createStudent,
  addClassTeacher,
  enrollStudent,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemberFields, emptyMember, type MemberDraft } from '@/features/dashboard/member-fields';

/**
 * Add a member to a class either by picking an eligible existing person or by
 * creating a brand-new account and adding them in one step (spec 004).
 * - students: `options` are students not in any class.
 * - teachers: `options` are teachers not already in this class.
 */
export function ClassAddMemberDialog({
  classId,
  instituteId,
  role,
  options,
  emptyHint,
  onDone,
}: {
  classId: string;
  instituteId: string;
  role: 'teacher' | 'student';
  options: { id: string; name: string }[];
  emptyHint: string;
  onDone: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const isStudent = role === 'student';

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState<MemberDraft>(emptyMember());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToClass = isStudent ? enrollStudent : addClassTeacher;

  async function addExisting() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await addToClass(classId, selected);
      finish();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = isStudent
        ? await createStudent(instituteId, draft)
        : await createTeacher(instituteId, draft);
      await addToClass(classId, created.id);
      finish();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    setOpen(false);
    setSelected('');
    setDraft(emptyMember());
    onDone();
  }

  const title = isStudent ? t('addStudentTitle') : t('addTeacherTitle');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {isStudent ? t('enrollInClass') : t('addTeacherToClass')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="existing">
          <TabsList className="w-full">
            <TabsTrigger value="existing" className="flex-1">{t('addExisting')}</TabsTrigger>
            <TabsTrigger value="new" className="flex-1">{t('addNew')}</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex flex-col gap-3 pt-3">
            {options.length === 0 ? (
              <p className="text-muted-foreground text-sm">{emptyHint}</p>
            ) : (
              <>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger>
                    <SelectValue placeholder={isStudent ? t('selectStudent') : t('selectTeacher')} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
                <Button disabled={!selected || busy} onClick={addExisting} className="w-full">
                  {busy ? tc('loading') : tc('save')}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="new" className="pt-3">
            <form onSubmit={createAndAdd} className="flex flex-col gap-4">
              <MemberFields
                value={draft}
                onChange={setDraft}
                withSchoolGrade={isStudent}
                idPrefix={`cls-${role}`}
              />
              {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? tc('loading') : tc('create')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
