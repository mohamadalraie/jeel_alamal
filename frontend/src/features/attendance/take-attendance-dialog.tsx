'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardCheck } from 'lucide-react';
import type { AttendanceStatus } from '@/lib/types';
import { takeAttendance, getSessionAttendance, ApiError } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useQueryClient, qk } from '@/lib/queries';
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
import { cn } from '@/lib/utils';
import { STATUS_COLOR, STATUS_ORDER } from './attendance-colors';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Take-attendance screen (spec 007): pick the lesson date, then mark every
 * student present/late/justified/absent. Pre-fills from an existing session for
 * the chosen date so a teacher can correct a prior take.
 *
 * Uncontrolled by default (renders its own button). Pass `open`/`onOpenChange`
 * to drive it from elsewhere (e.g. the calendar), and `initialDate` to open it
 * on a specific day.
 */
export function TakeAttendanceDialog({
  classId,
  roster,
  onDone,
  open: openProp,
  onOpenChange,
  initialDate,
  withTrigger = true,
}: {
  classId: string;
  roster: { id: string; name: string; isIntensive?: boolean }[];
  onDone: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDate?: string;
  withTrigger?: boolean;
}) {
  const t = useTranslations('attendance');
  const tc = useTranslations('common');
  const qc = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));

  const [date, setDate] = useState(initialDate ?? todayISO());
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRoster = roster;

  // Default everyone to undefined (unchecked)
  const resetAllUnchecked = () => {
    setStatuses({});
  };

  // On each open transition, jump to the requested date (or today).
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setDate(initialDate ?? todayISO());
    }
    prevOpen.current = open;
  }, [open, initialDate]);

  useEffect(() => {
    if (!open) return;
    resetAllUnchecked();
    getSessionAttendance(classId, date, undefined)
      .then((session) => {
        if (!session) return;
        setStatuses((prev) => {
          const next = { ...prev };
          for (const e of session.entries) next[e.studentId] = e.status;
          return next;
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, classId]);

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setStatuses((prev) => ({ ...prev, [studentId]: status }));

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of activeRoster) next[s.id] = status;
    setStatuses(next);
  };

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await takeAttendance(classId, {
        date,
        entries: activeRoster.map((s) => ({
          studentId: s.id,
          status: statuses[s.id] ?? 'present', // fallback just in case
        })),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.classAttendance(classId) }),
        ...activeRoster.map((s) =>
          qc.invalidateQueries({ queryKey: qk.studentAttendance(s.id) }),
        ),
      ]);
      notify.success(t('saved'));
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {withTrigger && (
        <DialogTrigger asChild>
          <Button>
            <ClipboardCheck data-icon="inline-start" />
            {t('takeAttendance')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('takeTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="att-date">{t('date')}</Label>
          <Input
            id="att-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Quick "mark all" row */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => markAll(s)}
              className="rounded-md border border-muted bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              {t('markAll')}: {t(s)}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {activeRoster.length > 0 && (
          <div className="flex flex-col gap-1 px-1">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>الإنجاز</span>
              <span>{activeRoster.filter(s => statuses[s.id] !== undefined).length} / {activeRoster.length}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${(activeRoster.filter(s => statuses[s.id] !== undefined).length / activeRoster.length) * 100}%` }} 
              />
            </div>
          </div>
        )}

        {/* Roster */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {activeRoster.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              لا يوجد طلاب مضافون في هذه الحلقة بعد.
            </div>
          ) : (
            <>
              {/* Unchecked Students */}
              {activeRoster.filter(s => statuses[s.id] === undefined).length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">لم يتم التفقد</h4>
                  <div className="flex flex-col divide-y">
                    {activeRoster
                      .filter((s) => statuses[s.id] === undefined)
                      .map((s) => (
                        <div key={s.id} className="flex flex-col gap-2 py-3 transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                          <span className="text-sm font-medium flex items-center justify-between">
                            <span>{s.name}</span>
                            {s.isIntensive && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-semibold">
                                ⚡ مكثف
                              </span>
                            )}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {STATUS_ORDER.map((status) => {
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setStatus(s.id, status)}
                                  className="flex-1 rounded-md border border-muted bg-muted/30 px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted active:scale-95"
                                >
                                  {t(status)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Checked Students */}
              {activeRoster.filter(s => statuses[s.id] !== undefined).length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">تم تفقدّهم</h4>
                  <div className="flex flex-col divide-y opacity-70">
                    {activeRoster
                      .filter((s) => statuses[s.id] !== undefined)
                      .map((s) => (
                        <div key={s.id} className="flex flex-col gap-2 py-2 transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                          <span className="text-sm font-medium flex items-center justify-between">
                            <span>{s.name}</span>
                            <span className="text-xs font-semibold" style={{ color: STATUS_COLOR[statuses[s.id]!] }}>
                              {t(statuses[s.id]!)}
                            </span>
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {STATUS_ORDER.map((status) => {
                              const active = statuses[s.id] === status;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setStatus(s.id, status)}
                                  className={cn(
                                    'rounded-md border px-2 py-1 text-[10px] font-medium transition',
                                    active ? 'text-white' : 'border-muted bg-muted/30 text-muted-foreground hover:bg-muted',
                                  )}
                                  style={
                                    active
                                      ? { backgroundColor: STATUS_COLOR[status], borderColor: STATUS_COLOR[status] }
                                      : {}
                                  }
                                >
                                  {t(status)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}

        <Button onClick={save} disabled={busy}>
          {busy ? tc('loading') : tc('save')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
