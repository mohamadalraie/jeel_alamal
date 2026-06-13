'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Clock } from 'lucide-react';
import type { ScheduleSlot, Weekday } from '@/lib/types';
import { setClassSchedule, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DAYS: Weekday[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

/**
 * Weekly attendance/lesson times (أوقات الحضور). Editable grid grouped by day;
 * "save" replaces the whole schedule (matches the backend set-schedule op).
 */
export function WeeklySchedule({
  classId,
  initial,
  canEdit,
  onSaved,
}: {
  classId: string;
  initial: ScheduleSlot[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tw = useTranslations('weekdays');
  const [slots, setSlots] = useState<ScheduleSlot[]>(
    initial.map((s) => ({ ...s })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function mutate(next: ScheduleSlot[]) {
    setSlots(next);
    setDirty(true);
  }
  function addSlot(day: Weekday) {
    mutate([...slots, { dayOfWeek: day, startTime: '16:00', endTime: '17:00' }]);
  }
  function removeSlot(idx: number) {
    mutate(slots.filter((_, i) => i !== idx));
  }
  function update(idx: number, patch: Partial<ScheduleSlot>) {
    mutate(slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setClassSchedule(classId, slots);
      setDirty(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DAYS.map((day) => {
          const daySlots = slots
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => s.dayOfWeek === day);
          return (
            <div key={day} className="border-border flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Clock className="text-primary size-3.5" />
                  {tw(day)}
                </span>
                {canEdit && (
                  <Button variant="ghost" size="icon" aria-label={t('addTime')} onClick={() => addSlot(day)}>
                    <Plus />
                  </Button>
                )}
              </div>
              {daySlots.length === 0 ? (
                <span className="text-muted-foreground text-xs">{t('noSchedule')}</span>
              ) : (
                daySlots.map(({ s, i }) => (
                  <div key={i} className="flex items-center gap-1.5" dir="ltr">
                    <Input
                      type="time"
                      value={s.startTime}
                      disabled={!canEdit}
                      onChange={(e) => update(i, { startTime: e.target.value })}
                      className="h-8 px-2 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="time"
                      value={s.endTime}
                      disabled={!canEdit}
                      onChange={(e) => update(i, { endTime: e.target.value })}
                      className="h-8 px-2 text-xs"
                    />
                    {canEdit && (
                      <Button variant="ghost" size="icon" aria-label={tc('cancel')} onClick={() => removeSlot(i)}>
                        <Trash2 className="text-destructive size-3.5" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || busy}>
            {busy ? tc('loading') : t('saveSchedule')}
          </Button>
        </div>
      )}
    </div>
  );
}
