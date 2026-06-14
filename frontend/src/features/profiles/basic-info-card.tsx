'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import type { BasicInfoInput, User } from '@/lib/types';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProfileField } from './profile-field';
import { GradeSelect, GradeLabel } from '@/features/shared/grade-select';
import { notify } from '@/lib/toast';

const PHONE_PATTERN = '\\+?[0-9]{7,15}';

/**
 * Basic-info card for a teacher or student. Shows the fields; if `canEdit`, an
 * edit dialog updates them via `onSave`. Validations (phone, birth date not in
 * future) match the backend. Reused by both profiles (constitution V).
 */
export function BasicInfoCard({
  user,
  withSchoolGrade = false,
  canEdit,
  onSave,
}: {
  user: User;
  withSchoolGrade?: boolean;
  canEdit: boolean;
  onSave: (input: BasicInfoInput) => Promise<void>;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BasicInfoInput>({
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate ?? '',
    phone: user.phone ?? '',
    schoolGrade: user.schoolGrade ?? '',
  });
  const todayIso = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(form);
      setOpen(false);
      notify.success(tc('save'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('basicInfo')}</CardTitle>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Pencil data-icon="inline-start" />
            {t('edit')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ProfileField label={t('firstName')} value={user.firstName} />
        <ProfileField label={t('lastName')} value={user.lastName} />
        <ProfileField label={t('username')} value={<span dir="ltr">{user.username}</span>} />
        <ProfileField label={t('birthDate')} value={user.birthDate ?? t('notSet')} />
        <ProfileField
          label={t('phone')}
          value={<span dir="ltr">{user.phone ?? t('notSet')}</span>}
        />
        {withSchoolGrade && (
          <ProfileField
            label={t('schoolGrade')}
            value={<GradeLabel grade={user.schoolGrade} />}
          />
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bi-first">{t('firstName')}</Label>
              <Input
                id="bi-first"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bi-last">{t('lastName')}</Label>
              <Input
                id="bi-last"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bi-birth">{t('birthDate')}</Label>
              <Input
                id="bi-birth"
                type="date"
                required
                max={todayIso}
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bi-phone">{t('phone')}</Label>
              <Input
                id="bi-phone"
                type="tel"
                dir="ltr"
                required
                pattern={PHONE_PATTERN}
                title="7–15 digits, optional +"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            {withSchoolGrade && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="bi-grade">{t('schoolGrade')}</Label>
                <GradeSelect
                  id="bi-grade"
                  value={form.schoolGrade ?? ''}
                  onChange={(v) => setForm({ ...form, schoolGrade: v })}
                />
              </div>
            )}
            {error && (
              <p role="alert" className="text-destructive text-sm sm:col-span-2">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full sm:col-span-2">
              {busy ? tc('loading') : tc('save')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
