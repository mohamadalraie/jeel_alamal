'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { createTeacher, createStudent, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MemberFields, emptyMember, type MemberDraft } from './member-fields';

/** Reused for both teachers and students (constitution V). */
export function AddMemberDialog({
  instituteId,
  role,
  onCreated,
}: {
  instituteId: string;
  role: 'teacher' | 'student';
  onCreated: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const isStudent = role === 'student';

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MemberDraft>(emptyMember());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isStudent) await createStudent(instituteId, draft);
      else await createTeacher(instituteId, draft);
      setOpen(false);
      setDraft(emptyMember());
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const label = isStudent ? t('addStudent') : t('addTeacher');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <MemberFields
            value={draft}
            onChange={setDraft}
            withSchoolGrade={isStudent}
            idPrefix={role}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? tc('loading') : tc('create')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
