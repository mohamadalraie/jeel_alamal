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
  open: openProp,
  onOpenChange,
  withTrigger = true,
}: {
  instituteId: string;
  students: { id: string; name: string }[];
  context?: DinarContext;
  onDone?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withTrigger?: boolean;
}) {
  const t = useTranslations('dinars');
  const tc = useTranslations('common');
  const qc = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));
  const [mode, setMode] = useState<'rule' | 'exceptional'>('rule');
  const [ruleId, setRuleId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    students.map((s) => s.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rules = [] } = useAwardableDinarRules(instituteId, open);
  const isBulk = students.length > 1;

  const reset = () => {
    setMode('rule');
    setRuleId('');
    setAmount('');
    setReason('');
    setSelectedStudentIds(students.map((s) => s.id));
    setError(null);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulk && selectedStudentIds.length === 0) {
      setError(t('noStudentsSelected'));
      return;
    }
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
      if (selectedStudentIds.length > 1) {
        await bulkAwardDinars({ ...input, studentIds: selectedStudentIds });
      } else {
        const targetId = selectedStudentIds[0] || students[0]?.id;
        if (!targetId) return;
        await awardDinar(targetId, input);
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
      {withTrigger && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" variant="outline">
              <Coins data-icon="inline-start" />
              {t('award')}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isBulk
              ? t('awardToN', { n: selectedStudentIds.length })
              : t('awardTo', { name: students[0]?.name ?? '' })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto p-1">
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

          {/* Student selection checklist */}
          {isBulk && (
            <div className="flex flex-col gap-2 rounded-lg border p-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{t('selectStudents')}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-primary"
                  onClick={toggleAllStudents}
                >
                  {selectedStudentIds.length === students.length
                    ? t('deselectAll')
                    : t('selectAll')}
                </Button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-border/50">
                {students.map((s) => {
                  const checked = selectedStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                        className="rounded border-border size-3.5 accent-primary"
                      />
                      <span className={checked ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                        {s.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
