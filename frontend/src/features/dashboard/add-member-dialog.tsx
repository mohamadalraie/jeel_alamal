'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { createTeacher, createStudent, createManager, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { emptyMember, type MemberDraft } from './member-fields';
import { UserSelectOrFields, type UserSearchResult } from './user-select-or-fields';

/** Reused for teachers, students, and managers (constitution V). */
export function AddMemberDialog({
  instituteId,
  role,
  onCreated,
}: {
  instituteId: string;
  role: 'teacher' | 'student' | 'manager';
  onCreated: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const isStudent = role === 'student';

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [draft, setDraft] = useState<MemberDraft>(emptyMember());
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload =
        mode === 'existing' && selectedUser
          ? { existingUserId: selectedUser.id }
          : draft;

      if (role === 'student') await createStudent(instituteId, payload as any);
      else if (role === 'manager') await createManager(instituteId, payload as any);
      else await createTeacher(instituteId, payload as any);

      setOpen(false);
      setDraft(emptyMember());
      setSelectedUser(null);
      setMode('new');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const label =
    role === 'student'
      ? t('addStudent')
      : role === 'manager'
        ? t('addManager')
        : t('addTeacher');
  const backendRole = role === 'manager' ? 'institute_manager' : role;

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
          <UserSelectOrFields
            role={backendRole}
            mode={mode}
            onModeChange={setMode}
            newDraft={draft}
            onNewDraftChange={setDraft}
            selectedUserId={selectedUser?.id ?? null}
            onSelectUser={setSelectedUser}
            withSchoolGrade={isStudent}
            idPrefix={role}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || (mode === 'existing' && !selectedUser)}
            className="w-full"
          >
            {busy ? tc('loading') : tc('create')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
