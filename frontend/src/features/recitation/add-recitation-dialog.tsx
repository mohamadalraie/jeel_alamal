'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, Search } from 'lucide-react';
import type { RecitationRating, Surah } from '@/lib/types';
import { addRecitation, ApiError } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useStudentRecitation, useQueryClient, qk } from '@/lib/queries';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const RATINGS: RecitationRating[] = ['excellent', 'very_good', 'good', 'acceptable', 'weak'];

/**
 * Add-recitation dialog (spec 005 + 006): searchable surah → from/to ayah that
 * AUTO-CONTINUES from where the student last reached → rating. Shows the
 * student's progress for the chosen surah so the teacher knows what's left.
 */
export function AddRecitationDialog({
  surahs,
  studentId,
  students,
  onDone,
}: {
  surahs: Surah[];
  studentId?: string;
  students?: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations('recitation');
  const tc = useTranslations('common');
  const tr = useTranslations('ratings');
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState(studentId ?? '');
  const [query, setQuery] = useState('');
  const [surah, setSurah] = useState<Surah | null>(null);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [rating, setRating] = useState<RecitationRating>('excellent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The selected student's current progress (to auto-continue + show what's left).
  const { data: recitation } = useStudentRecitation(open ? student : undefined);
  const cell = useMemo(
    () => (surah ? recitation?.heart.find((c) => c.number === surah.number) : undefined),
    [recitation, surah],
  );

  const filtered = useMemo(
    () => (query ? surahs.filter((s) => s.name.includes(query.trim())) : surahs),
    [surahs, query],
  );

  function pickSurah(s: Surah) {
    setSurah(s);
    // Continue from where the student reached; full/none → start at 1.
    const next = recitation?.heart.find((c) => c.number === s.number)?.nextAyah;
    setFrom(next && next <= s.ayahCount ? next : 1);
    setTo(s.ayahCount);
    setQuery('');
  }

  function reset() {
    setStudent(studentId ?? '');
    setQuery('');
    setSurah(null);
    setFrom(1);
    setTo(1);
    setRating('excellent');
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!surah || !student) return;
    setBusy(true);
    setError(null);
    try {
      await addRecitation(student, { surahNumber: surah.number, fromAyah: from, toAyah: to, rating });
      qc.invalidateQueries({ queryKey: qk.studentRecitation(student) });
      setOpen(false);
      reset();
      onDone();
      notify.success(t('addRecitation'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          {t('recite')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('addRecitation')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {students && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('selectStudent')}</Label>
              <Select
                value={student}
                onValueChange={(v) => {
                  setStudent(v);
                  setSurah(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectStudent')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Searchable surah list */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('surah')}</Label>
            <div className="border-border overflow-hidden rounded-lg border">
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute start-2 top-2.5 size-4" />
                <Input
                  value={query}
                  placeholder={surah ? surah.name : t('searchSurah')}
                  onChange={(e) => setQuery(e.target.value)}
                  className="border-0 ps-8"
                />
              </div>
              {(query || !surah) && (
                <ul className="max-h-44 overflow-y-auto border-t">
                  {filtered.map((s) => {
                    const sc = recitation?.heart.find((c) => c.number === s.number);
                    return (
                      <li key={s.number}>
                        <button
                          type="button"
                          onClick={() => pickSurah(s)}
                          className={cn(
                            'hover:bg-muted flex w-full items-center justify-between px-3 py-2 text-start text-sm',
                            surah?.number === s.number && 'bg-muted',
                          )}
                        >
                          <span>
                            {s.number}. {s.name}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            {sc && sc.percent > 0 && <span>٪{sc.percent}</span>}
                            <span>{s.ayahCount}</span>
                            {surah?.number === s.number && <Check className="size-3.5" />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Progress for the chosen surah */}
          {surah && cell && cell.coveredAyahs > 0 && (
            <div className="bg-muted/40 flex flex-col gap-1 rounded-lg p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('progress')}</span>
                <span className="font-medium">
                  {cell.coveredAyahs}/{surah.ayahCount} · ٪{cell.percent}
                </span>
              </div>
              <div className="bg-border h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full" style={{ width: `${cell.percent}%` }} />
              </div>
              {cell.status !== 'full' && cell.nextAyah && (
                <span className="text-muted-foreground">{t('continueFrom', { n: cell.nextAyah })}</span>
              )}
            </div>
          )}

          {surah && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="from-ayah">{t('fromAyah')}</Label>
                <Input
                  id="from-ayah"
                  type="number"
                  min={1}
                  max={surah.ayahCount}
                  value={from}
                  onChange={(e) => setFrom(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="to-ayah">{t('toAyah')}</Label>
                <Input
                  id="to-ayah"
                  type="number"
                  min={from}
                  max={surah.ayahCount}
                  value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t('rating')}</Label>
            <Select value={rating} onValueChange={(v) => setRating(v as RecitationRating)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATINGS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tr(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={busy || !surah || !student} className="w-full">
            {busy ? tc('loading') : tc('save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
