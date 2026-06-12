'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { User } from '@/lib/types';
import {
  listTeachers,
  listStudents,
  createTeacher,
  createStudent,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MemberFields, emptyMember, type MemberDraft } from './member-fields';

/**
 * ONE tab component for both teachers and students (constitution V — reuse).
 * The role prop decides the API endpoints and the extra school-grade field.
 */
export function MembersTab({
  instituteId,
  role,
}: {
  instituteId: string;
  role: 'teacher' | 'student';
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const isStudent = role === 'student';

  const [members, setMembers] = useState<User[] | null>(null);
  const [draft, setDraft] = useState<MemberDraft>(emptyMember());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    const load = isStudent ? listStudents : listTeachers;
    load(instituteId).then(setMembers).catch(() => setMembers([]));
  }, [instituteId, isStudent]);
  useEffect(refresh, [refresh]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isStudent) {
        await createStudent(instituteId, draft);
      } else {
        await createTeacher(instituteId, draft);
      }
      setOpen(false);
      setDraft(emptyMember());
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const addLabel = isStudent ? t('addStudent') : t('addTeacher');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus data-icon="inline-start" />
              {addLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{addLabel}</DialogTitle>
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
      </div>

      {members === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground">{tc('noData')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('username')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              {isStudent && <TableHead>{t('schoolGrade')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.firstName} {m.lastName}
                </TableCell>
                <TableCell dir="ltr">{m.username}</TableCell>
                <TableCell dir="ltr">{m.phone}</TableCell>
                {isStudent && <TableCell>{m.schoolGrade ?? '—'}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
