'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Clock } from 'lucide-react';
import type { Anchor, Prayer, ScheduleSlot, Weekday } from '@/lib/types';
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
const PRAYERS: Prayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Read-only label for an anchor: a clock time or a prayer name. */
function AnchorText({ anchor }: { anchor: Anchor }) {
  const tp = useTranslations('prayers');
  if (anchor.kind === 'prayer') return <>{tp(anchor.value)}</>;
  return <span dir="ltr">{anchor.value}</span>;
}

/** A sensible default anchor when the user switches the kind. */
const anchorFor = (kind: 'time' | 'prayer'): Anchor =>
  kind === 'prayer' ? { kind: 'prayer', value: 'dhuhr' } : { kind: 'time', value: '16:00' };

/**
 * The value control for an anchor (the kind is chosen separately so rows don't
 * carry a redundant time/prayer toggle): a clock input or a prayer picker.
 */
function ValueEditor({
  anchor,
  onChange,
}: {
  anchor: Anchor;
  onChange: (a: Anchor) => void;
}) {
  const tp = useTranslations('prayers');
  if (anchor.kind === 'time') {
    return (
      <Input
        type="time"
        dir="ltr"
        value={anchor.value}
        onChange={(e) => onChange({ kind: 'time', value: e.target.value })}
        className="h-8 min-w-0 flex-1 px-2 text-xs"
      />
    );
  }
  return (
    <Select value={anchor.value} onValueChange={(v) => onChange({ kind: 'prayer', value: v })}>
      <SelectTrigger className="h-8 min-w-0 flex-1 px-2 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRAYERS.map((p) => (
          <SelectItem key={p} value={p}>
            {tp(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Weekly lesson times (أوقات الدروس). Each slot has a start anchor and an
 * optional end anchor; an anchor is a clock time or a prayer (spec 004).
 * "Save" replaces the whole schedule (matches the backend set op).
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
  const [slots, setSlots] = useState<ScheduleSlot[]>(initial.map((s) => ({ ...s })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function mutate(next: ScheduleSlot[]) {
    setSlots(next);
    setDirty(true);
  }
  const addSlot = (day: Weekday) =>
    mutate([...slots, { dayOfWeek: day, start: { kind: 'time', value: '16:00' }, end: null }]);
  const removeSlot = (idx: number) => mutate(slots.filter((_, i) => i !== idx));
  const patch = (idx: number, p: Partial<ScheduleSlot>) =>
    mutate(slots.map((s, i) => (i === idx ? { ...s, ...p } : s)));

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
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {DAYS.map((day) => {
          const daySlots = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.dayOfWeek === day);
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
                daySlots.map(({ s, i }) =>
                  canEdit ? (
                    <div key={i} className="bg-muted/40 flex flex-col gap-2 rounded-md p-2">
                      {/* Start: kind + value */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-9 shrink-0 text-xs">{t('startsAt')}</span>
                        <Select
                          value={s.start.kind}
                          onValueChange={(k) => patch(i, { start: anchorFor(k as 'time' | 'prayer') })}
                        >
                          <SelectTrigger className="h-8 shrink-0 px-2 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time">{t('anchorTime')}</SelectItem>
                            <SelectItem value="prayer">{t('anchorPrayer')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <ValueEditor anchor={s.start} onChange={(a) => patch(i, { start: a })} />
                        <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={tc('cancel')} onClick={() => removeSlot(i)}>
                          <Trash2 className="text-destructive size-3.5" />
                        </Button>
                      </div>
                      {/* End: kind (incl. none) + value */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-9 shrink-0 text-xs">{t('endsAt')}</span>
                        <Select
                          value={s.end ? s.end.kind : 'none'}
                          onValueChange={(v) =>
                            patch(i, { end: v === 'none' ? null : anchorFor(v as 'time' | 'prayer') })
                          }
                        >
                          <SelectTrigger className="h-8 shrink-0 px-2 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('noEnd')}</SelectItem>
                            <SelectItem value="time">{t('anchorTime')}</SelectItem>
                            <SelectItem value="prayer">{t('anchorPrayer')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {s.end && (
                          <ValueEditor anchor={s.end} onChange={(a) => patch(i, { end: a })} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="text-sm">
                      <AnchorText anchor={s.start} />
                      {s.end && (
                        <>
                          {' — '}
                          <AnchorText anchor={s.end} />
                        </>
                      )}
                    </div>
                  ),
                )
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
