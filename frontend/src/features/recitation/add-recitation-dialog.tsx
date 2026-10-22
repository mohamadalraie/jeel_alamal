'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Check, Search, BookOpenCheck, Info, Loader2 } from 'lucide-react';
import type { RecitationRating, Surah } from '@/lib/types';
import { addRecitation, ApiError } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useStudentRecitation, useQueryClient, qk } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  open: openProp,
  onOpenChange,
  withTrigger = true,
}: {
  surahs: Surah[];
  studentId?: string;
  students?: { id: string; name: string }[];
  onDone: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  withTrigger?: boolean;
}) {
  const t = useTranslations('recitation');
  const tc = useTranslations('common');
  const tr = useTranslations('ratings');
  const qc = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));
  const [student, setStudent] = useState(studentId ?? '');
  const [query, setQuery] = useState('');
  const [surah, setSurah] = useState<Surah | null>(null);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [rating, setRating] = useState<RecitationRating>('excellent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The selected student's current progress (to auto-continue + show what's left).
  const { data: recitation, isLoading: isLoadingRecitation } = useStudentRecitation(open ? student : undefined);
  const cell = useMemo(
    () => (surah ? recitation?.heart.find((c) => c.number === surah.number) : undefined),
    [recitation, surah],
  );

  const lastReachedAyah = useMemo(() => {
    if (!cell || !cell.ranges || cell.ranges.length === 0) return 0;
    return Math.max(...cell.ranges.map(([_, to]) => to));
  }, [cell]);

  const nextAyah = useMemo(() => {
    if (!cell) return 1;
    if (cell.nextAyah && cell.nextAyah <= (surah?.ayahCount ?? 1)) {
      return cell.nextAyah;
    }
    return lastReachedAyah > 0 ? Math.min(lastReachedAyah + 1, surah?.ayahCount ?? 1) : 1;
  }, [cell, lastReachedAyah, surah]);

  // Synchronize default from/to whenever surah or student progress updates
  useEffect(() => {
    if (!surah) return;
    const defaultStart = lastReachedAyah > 0 ? lastReachedAyah : 1;
    setFrom(defaultStart);
    setTo(surah.ayahCount);
  }, [surah?.number, lastReachedAyah]);

  const filtered = useMemo(
    () => (query ? surahs.filter((s) => s.name.includes(query.trim())) : surahs),
    [surahs, query],
  );

  function pickSurah(s: Surah) {
    setSurah(s);
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
        {withTrigger ? (
          <Button>
            <Plus data-icon="inline-start" />
            {t('recite')}
          </Button>
        ) : <span className="hidden" />}
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectStudent')} />
                </SelectTrigger>
                <SelectContent className="z-[70] max-h-56">
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

          {/* Progress & Last reached ayah for the chosen surah */}
          {surah && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs sm:text-sm">
              {isLoadingRecitation ? (
                <div className="flex items-center gap-2 text-muted-foreground py-1">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span>جارِ تحميل سجل تسميع الطالب...</span>
                </div>
              ) : cell && lastReachedAyah > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <BookOpenCheck className="size-4 text-primary" />
                      <span>آخر آية سمعها الطالب: الآية {lastReachedAyah} (من {surah.ayahCount})</span>
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                      ٪{cell.percent} من السورة
                    </Badge>
                  </div>

                  <div className="bg-border/60 h-2 overflow-hidden rounded-full">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${cell.percent}%` }} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                    <span>
                      المسمّع سابقاً: {cell.coveredAyahs} آية
                      {cell.ranges.length > 0 && ` (${cell.ranges.map(([f, t]) => f === t ? `${f}` : `${f}-${t}`).join('، ')})`}
                    </span>
                    <span>المتبقي: {Math.max(0, surah.ayahCount - cell.coveredAyahs)} آية</span>
                  </div>

                  {/* Quick starting ayah pickers */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground font-medium">البدء سريعاً من:</span>
                    <button
                      type="button"
                      onClick={() => setFrom(lastReachedAyah)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                        from === lastReachedAyah
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border-border'
                      )}
                    >
                      آخر آية وصلها ({lastReachedAyah})
                    </button>
                    {nextAyah <= surah.ayahCount && nextAyah !== lastReachedAyah && (
                      <button
                        type="button"
                        onClick={() => setFrom(nextAyah)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer',
                          from === nextAyah
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-background hover:bg-muted text-foreground border-border'
                        )}
                      >
                        الآية التالية ({nextAyah})
                      </button>
                    )}
                  </div>
                </div>
              ) : cell && cell.status === 'full' ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold py-1">
                  <Check className="size-4" />
                  <span>الطالب أتم حفظ وتسميع سورة {surah.name} بالكامل (100%)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground py-1">
                  <Info className="size-4 text-primary" />
                  <span>لم يبدأ الطالب بحفظ أو تسميع سورة {surah.name} بعد (البداية الافتراضية: الآية 1)</span>
                </div>
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
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70] max-h-56">
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
