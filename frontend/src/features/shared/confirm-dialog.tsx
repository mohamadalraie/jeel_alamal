'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Reusable confirm dialog for destructive actions (delete). Triggered by any
 * element passed as `trigger`.
 */
export function ConfirmDialog({
  title,
  message,
  confirmText,
  variant = 'destructive',
  showSuccessToast = true,
  onConfirm,
  trigger,
}: {
  title?: string;
  message?: string;
  confirmText?: string;
  variant?: 'destructive' | 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  showSuccessToast?: boolean;
  onConfirm: () => Promise<void> | void;
  trigger: React.ReactNode;
}) {
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? td('confirmDelete')}</DialogTitle>
          <DialogDescription>{message ?? td('confirmDeleteMsg')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {tc('cancel')}
          </Button>
          <Button
            variant={variant}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
                if (showSuccessToast) {
                  notify.success(td('delete'));
                }
              } catch (err) {
                notify.error(err, tc('error'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmText ?? td('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
