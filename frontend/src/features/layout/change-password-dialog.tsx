'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { changePassword } from '@/lib/api';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pe-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex items-center px-3 transition"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (next !== confirm) {
      setError(t('passwordMismatch'));
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      notify.success(t('passwordChanged'));
      onOpenChange(false);
      reset();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('incorrect') || msg.includes('401')) {
        setError(t('wrongCurrentPassword'));
      } else {
        setError(msg || tc('error'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="text-primary size-5" />
            {t('changePassword')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <PasswordInput
            id="current-password"
            label={t('currentPassword')}
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
          <PasswordInput
            id="new-password"
            label={t('newPassword')}
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          <PasswordInput
            id="confirm-password"
            label={t('confirmPassword')}
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={saving || !current || !next || !confirm}>
              {saving ? tc('loading') : tc('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
