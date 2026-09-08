'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Coins, Users, Plus, Check } from 'lucide-react';
import type { DinarRule } from '@/lib/types';
import { awardDinar, bulkAwardDinars, ApiError } from '@/lib/api';
import { useAwardableDinarRules, useClassProfile, useQueryClient } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function LessonTimerDinars({
  instituteId,
  classId,
}: {
  instituteId: string;
  classId: string;
}) {
  const t = useTranslations('dinars');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const { data: rules = [] } = useAwardableDinarRules(instituteId, true);
  const { data: classProfile } = useClassProfile(classId);

  const students = classProfile?.students ?? [];

  const [selectedRule, setSelectedRule] = useState<DinarRule | null>(null);
  const [isExceptional, setIsExceptional] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openForRule = (rule: DinarRule) => {
    setSelectedRule(rule);
    setIsExceptional(false);
    setSelectedStudentIds([]);
    setError(null);
    setDialogOpen(true);
  };

  const openForExceptional = () => {
    setSelectedRule(null);
    setIsExceptional(true);
    setAmount('');
    setReason('');
    setSelectedStudentIds([]);
    setError(null);
    setDialogOpen(true);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setError(t('selectStudentRequired') || 'يرجى اختيار طالب واحد على الأقل');
      return;
    }

    let payload: any;
    if (isExceptional) {
      const n = Number(amount);
      if (!Number.isInteger(n) || n === 0) {
        setError(t('amountNonZero'));
        return;
      }
      if (!reason.trim()) {
        setError(t('reasonRequired'));
        return;
      }
      payload = { amount: n, reason: reason.trim(), context: 'lesson' };
    } else if (selectedRule) {
      payload = { ruleId: selectedRule.id, context: 'lesson' };
    } else {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (selectedStudentIds.length === 1) {
        await awardDinar(selectedStudentIds[0], payload);
      } else {
        await bulkAwardDinars({ ...payload, studentIds: selectedStudentIds });
      }
      qc.invalidateQueries({ queryKey: ['student-dinars'] });
      qc.invalidateQueries({ queryKey: ['dinar-leaderboard'] });
      notify.success(t('awarded'));
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Coins className="text-primary size-4" />
            {t('optionsTitle') || 'خيارات الدنانير للطلاب'}
          </span>
          {students.length > 0 && (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Users className="size-3" />
              {students.length} طالب
            </span>
          )}
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rules.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => openForRule(rule)}
              className="hover:border-primary/50 hover:bg-accent flex items-center justify-between gap-2 rounded-lg border p-2.5 text-start transition"
            >
              <span className="min-w-0 truncate text-xs font-medium">{rule.name}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                  rule.amount > 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                <bdi>{rule.amount > 0 ? `+${rule.amount}` : rule.amount}</bdi>
              </span>
            </button>
          ))}

          {/* Exceptional option */}
          <button
            type="button"
            onClick={openForExceptional}
            className="hover:border-primary/50 hover:bg-accent flex items-center justify-center gap-1 rounded-lg border border-dashed p-2.5 text-xs font-medium transition"
          >
            <Plus className="size-3.5" />
            {t('exceptional') || 'مبلغ استثنائي'}
          </button>
        </div>
      </CardContent>

      {/* Student Selection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="text-primary size-5" />
              {isExceptional
                ? t('exceptional') || 'منح دنانير استثنائية'
                : `تطبيق "${selectedRule?.name}" (${
                    selectedRule && selectedRule.amount > 0 ? '+' : ''
                  }${selectedRule?.amount ?? 0})`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isExceptional && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lesson-award-amount">{t('amount')}</Label>
                  <Input
                    id="lesson-award-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="-5 / +5"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lesson-award-reason">{t('reason')}</Label>
                  <Textarea
                    id="lesson-award-reason"
                    value={reason}
                    maxLength={200}
                    rows={2}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Student selection list */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  اختر الطالب الذي ستطبق عليه الدنانير:
                </Label>
                {students.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={toggleAll}
                  >
                    {selectedStudentIds.length === students.length
                      ? 'إلغاء تحديد الكل'
                      : 'تحديد الكل'}
                  </Button>
                )}
              </div>

              {students.length === 0 ? (
                <p className="text-muted-foreground py-2 text-xs">لا يوجد طلاب في هذه الحلقة حالياً.</p>
              ) : (
                <div className="border-border max-h-48 overflow-y-auto rounded-lg border divide-y">
                  {students.map((student) => {
                    const selected = selectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`flex cursor-pointer items-center justify-between p-2.5 text-xs transition ${
                          selected ? 'bg-primary/10 font-semibold' : 'hover:bg-accent'
                        }`}
                      >
                        <span>{student.name}</span>
                        <div className="flex items-center gap-2">
                          {student.schoolGrade && (
                            <span className="text-muted-foreground text-[10px]">
                              {student.schoolGrade}
                            </span>
                          )}
                          <div
                            className={`flex size-4 items-center justify-center rounded border transition ${
                              selected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-input bg-background'
                            }`}
                          >
                            {selected && <Check className="size-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {error && <p role="alert" className="text-destructive text-xs font-medium">{error}</p>}

            <Button
              type="submit"
              disabled={busy || selectedStudentIds.length === 0}
              className="w-full"
            >
              {busy
                ? tc('loading')
                : selectedStudentIds.length > 0
                ? `تطبيق الدنانير (${selectedStudentIds.length})`
                : 'اختر طالباً للبدء'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
