'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { resetStudentPassword, ApiError } from '@/lib/api';
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

export function ResetStudentPasswordDialog({
  instituteId,
  studentId,
  studentName,
  onDone,
  trigger,
}: {
  instituteId: string;
  studentId: string;
  studentName: string;
  onDone?: () => void;
  trigger?: React.ReactNode;
}) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setNewPassword('');
    setShowPassword(false);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await resetStudentPassword(instituteId, studentId, newPassword);
      setOpen(false);
      reset();
      onDone?.();
      notify.success(t('passwordChanged'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <KeyRound className="size-3.5" />
            <span>{t('changePassword')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <span>{t('changePassword')} — {studentName}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-student-password">{t('newPassword')}</Label>
            <div className="relative">
              <Input
                id="new-student-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-destructive text-xs">{error}</p>}

          <Button type="submit" disabled={busy || newPassword.length < 8} className="w-full">
            {busy ? tc('loading') : tc('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
