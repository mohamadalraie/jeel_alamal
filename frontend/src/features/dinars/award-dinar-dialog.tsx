'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Coins } from 'lucide-react';
import type { AwardDinarInput, DinarContext } from '@/lib/types';
import { awardDinar, bulkAwardDinars, ApiError } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useAwardableDinarRules, useQueryClient } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

/**
 * Award dinars to one or many students (spec 010, US2). A rule from the active
 * catalogue, or an exceptional custom amount with a mandatory reason. Reused by
 * the student profile (single) and the class roster / lesson timer (bulk).
 */
export function AwardDinarDialog({
  instituteId,
  students,
  context = 'general',
  onDone,
  trigger,
}: {
  instituteId: string;
  students: { id: string; name: string }[];
  context?: DinarContext;
  onDone?: () => void;
  trigger?: React.ReactNode;
}) {
  const t = useTranslations('dinars');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'rule' | 'exceptional'>('rule');
  const [ruleId, setRuleId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rules = [] } = useAwardableDinarRules(instituteId, open);
  const isBulk = students.length > 1;

  const reset = () => {
    setMode('rule');
    setRuleId('');
    setAmount('');
    setReason('');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let input: AwardDinarInput;
    if (mode === 'rule') {
      if (!ruleId) return;
      input = { ruleId, context };
    } else {
      const n = Number(amount);
      if (!Number.isInteger(n) || n === 0) {
        setError(t('amountNonZero'));
        return;
      }
      if (!reason.trim()) {
        setError(t('reasonRequired'));
        return;
      }
      input = { amount: n, reason: reason.trim(), context };
    }
    setBusy(true);
    setError(null);
    try {
      if (isBulk) {
        await bulkAwardDinars({ ...input, studentIds: students.map((s) => s.id) });
      } else {
        await awardDinar(students[0].id, input);
      }
      qc.invalidateQueries({ queryKey: ['student-dinars'] });
      qc.invalidateQueries({ queryKey: ['dinar-leaderboard'] });
      setOpen(false);
      reset();
      onDone?.();
      notify.success(t('awarded'));
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
          <Button size="sm" variant="outline">
            <Coins data-icon="inline-start" />
            {t('award')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? t('awardToN', { n: students.length }) : t('awardTo', { name: students[0]?.name ?? '' })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === 'rule' ? 'default' : 'ghost'}
              className="h-7 flex-1 text-xs"
              onClick={() => setMode('rule')}
            >
              {t('byRule')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'exceptional' ? 'default' : 'ghost'}
              className="h-7 flex-1 text-xs"
              onClick={() => setMode('exceptional')}
            >
              {t('exceptional')}
            </Button>
          </div>

          {mode === 'rule' ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t('rule')}</Label>
              <Select value={ruleId} onValueChange={setRuleId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectRule')} />
                </SelectTrigger>
                <SelectContent>
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <bdi>
                        {r.name} ({r.amount > 0 ? '+' : ''}
                        {r.amount})
                      </bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rules.length === 0 && (
                <p className="text-muted-foreground text-xs">{t('noAwardableRules')}</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="award-amount">{t('amount')}</Label>
                <Input
                  id="award-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="-5 / +5"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="award-reason">{t('reason')}</Label>
                <Textarea
                  id="award-reason"
                  value={reason}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </>
          )}

          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <Button
            type="submit"
            disabled={busy || (mode === 'rule' && !ruleId)}
            className="w-full"
          >
            {busy ? tc('loading') : t('award')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
