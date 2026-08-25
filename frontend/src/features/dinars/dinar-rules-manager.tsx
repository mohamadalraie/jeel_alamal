'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CreateDinarRuleInput, DinarRule } from '@/lib/types';
import {
  createDinarRule,
  updateDinarRule,
  deleteDinarRule,
  ApiError,
} from '@/lib/api';
import { notify } from '@/lib/toast';
import { useDinarRules, useQueryClient, qk } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListSkeleton } from '@/features/shared/skeletons';
import { EmptyState } from '@/features/shared/empty-state';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { Coins } from 'lucide-react';
import { DinarBadge } from './dinar-badge';

const systemLabelKey = (systemKey: string) => systemKey.replace('.', '_');

/** Manager screen: manual rules CRUD + configuration of the seeded system rules. */
export function DinarRulesManager({ instituteId }: { instituteId: string }) {
  const t = useTranslations('dinars');
  const qc = useQueryClient();
  const { data, isLoading } = useDinarRules(instituteId);
  const refresh = () => qc.invalidateQueries({ queryKey: qk.dinarRules(instituteId) });

  if (isLoading || !data) return <ListSkeleton />;

  const attendance = data.system.filter((r) => r.context === 'attendance');
  const recitation = data.system.filter((r) => r.context === 'recitation');

  return (
    <div className="flex flex-col gap-8">
      {/* Manual rules */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{t('manualRules')}</h2>
            <p className="text-muted-foreground text-sm">{t('manualRulesHint')}</p>
          </div>
          <RuleFormDialog instituteId={instituteId} onDone={refresh} />
        </div>

        {data.manual.length === 0 ? (
          <EmptyState icon={Coins} title={t('noManualRules')} />
        ) : (
          <div className="flex flex-col gap-2">
            {data.manual.map((rule) => (
              <ManualRuleRow
                key={rule.id}
                rule={rule}
                instituteId={instituteId}
                onDone={refresh}
              />
            ))}
          </div>
        )}
      </section>

      {/* System rules */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold">{t('systemRules')}</h2>
          <p className="text-muted-foreground text-sm">{t('systemRulesHint')}</p>
        </div>

        <SystemGroup title={t('attendanceRules')} rules={attendance} onDone={refresh} t={t} />
        <SystemGroup title={t('recitationRules')} rules={recitation} onDone={refresh} t={t} />
      </section>
    </div>
  );
}

function ManualRuleRow({
  rule,
  instituteId,
  onDone,
}: {
  rule: DinarRule;
  instituteId: string;
  onDone: () => void;
}) {
  const t = useTranslations('dinars');
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-2 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <DinarBadge amount={rule.amount} showIcon={false} />
          <span className="truncate text-sm font-medium">{rule.name}</span>
          <span className="text-muted-foreground text-xs">{t(`context_${rule.context}`)}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <RuleFormDialog
              instituteId={instituteId}
              editing={rule}
              onDone={onDone}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="size-4" />
                  {t('editRule')}
                </DropdownMenuItem>
              }
            />
            <ConfirmDialog
              title={t('deleteRule')}
              message={t('deleteRuleMsg')}
              onConfirm={async () => {
                try {
                  await deleteDinarRule(rule.id);
                  onDone();
                } catch (err) {
                  notify.error(err, t('deleteBlocked'));
                }
              }}
              trigger={
                <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="size-4" />
                  {t('deleteRule')}
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

function SystemGroup({
  title,
  rules,
  onDone,
  t,
}: {
  title: string;
  rules: DinarRule[];
  onDone: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase">{title}</h3>
      {rules.map((rule) => (
        <SystemRuleRow key={rule.id} rule={rule} onDone={onDone} t={t} />
      ))}
    </div>
  );
}

function SystemRuleRow({
  rule,
  onDone,
  t,
}: {
  rule: DinarRule;
  onDone: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [amount, setAmount] = useState(String(rule.amount));
  const [busy, setBusy] = useState(false);

  const save = async (patch: { amount?: number; isActive?: boolean }) => {
    setBusy(true);
    try {
      await updateDinarRule(rule.id, patch);
      onDone();
    } catch (err) {
      notify.error(err, t('saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const commitAmount = () => {
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0 || n === rule.amount) {
      setAmount(String(rule.amount));
      return;
    }
    void save({ amount: n });
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {t(`systemRules_${systemLabelKey(rule.systemKey ?? '')}`)}
        </span>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={commitAmount}
          disabled={busy}
          className="h-8 w-20 text-center tabular-nums"
          aria-label={t('amount')}
        />
        <Button
          type="button"
          size="sm"
          variant={rule.isActive ? 'default' : 'outline'}
          disabled={busy}
          onClick={() => void save({ isActive: !rule.isActive })}
          className="h-8 min-w-16"
        >
          {rule.isActive ? t('active') : t('inactive')}
        </Button>
      </CardContent>
    </Card>
  );
}

function RuleFormDialog({
  instituteId,
  editing,
  onDone,
  trigger,
}: {
  instituteId: string;
  editing?: DinarRule;
  onDone: () => void;
  trigger?: React.ReactNode;
}) {
  const t = useTranslations('dinars');
  const tc = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(String(editing?.amount ?? 5));
  const [context, setContext] = useState<CreateDinarRuleInput['context']>(
    (editing?.context as CreateDinarRuleInput['context']) ?? 'lesson',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(editing?.name ?? '');
    setAmount(String(editing?.amount ?? 5));
    setContext((editing?.context as CreateDinarRuleInput['context']) ?? 'lesson');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0) {
      setError(t('amountNonZero'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateDinarRule(editing.id, { name, amount: n });
      } else {
        await createDinarRule(instituteId, { name, amount: n, context });
      }
      setOpen(false);
      onDone();
      notify.success(tc('save'));
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
          <Button size="sm">
            <Plus data-icon="inline-start" />
            {t('addRule')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? t('editRule') : t('addRule')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-name">{t('ruleName')}</Label>
            <Input
              id="rule-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rule-amount">{t('amount')}</Label>
            <Input
              id="rule-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">{t('amountHint')}</p>
          </div>
          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('context')}</Label>
              <Select
                value={context}
                onValueChange={(v) => setContext(v as CreateDinarRuleInput['context'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson">{t('context_lesson')}</SelectItem>
                  <SelectItem value="recitation">{t('context_recitation')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={busy || !name} className="w-full">
            {busy ? tc('loading') : tc('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
