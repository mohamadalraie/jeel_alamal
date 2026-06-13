'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, X } from 'lucide-react';
import type {
  Certification,
  StudyDegree,
  TajweedLevel,
  TeacherDetails,
} from '@/lib/types';
import {
  updateTeacherDetails,
  addCertification,
  removeCertification,
  ApiError,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProfileField } from './profile-field';

const DEGREES: StudyDegree[] = ['secondary', 'diploma', 'bachelor', 'master', 'phd'];
const TAJWEED: TajweedLevel[] = ['excellent', 'very_good', 'good', 'acceptable', 'weak'];

/** Teacher's extended Islamic-knowledge details + certifications (manager/super_admin). */
export function TeacherExtendedCard({
  instituteId,
  teacherId,
  details,
  certifications,
  onChanged,
}: {
  instituteId: string;
  teacherId: string;
  details: TeacherDetails;
  certifications: Certification[];
  onChanged: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tDeg = useTranslations('degrees');
  const tTaj = useTranslations('tajweed');

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherDetails>(details);
  const [newCert, setNewCert] = useState('');

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateTeacherDetails(instituteId, teacherId, form);
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('islamicKnowledge')}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil data-icon="inline-start" />
          {t('edit')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ProfileField
            label={t('studyDegree')}
            value={details.studyDegree ? tDeg(details.studyDegree) : t('notSet')}
          />
          <ProfileField label={t('studyField')} value={details.studyField ?? t('notSet')} />
          <ProfileField
            label={t('quranParts')}
            value={
              details.quranPartsMemorized != null
                ? `${details.quranPartsMemorized} / 30`
                : t('notSet')
            }
          />
          <ProfileField
            label={t('tajweedLevel')}
            value={details.tajweedLevel ? tTaj(details.tajweedLevel) : t('notSet')}
          />
        </div>

        {/* Certifications — add/remove list */}
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">{t('certifications')}</h4>
          <div className="flex flex-wrap gap-2">
            {certifications.length === 0 && (
              <span className="text-muted-foreground text-sm">{tc('noData')}</span>
            )}
            {certifications.map((c) => (
              <Badge key={c.id} variant="secondary" className="gap-1.5 py-1">
                {c.title}
                <button
                  type="button"
                  aria-label={t('delete')}
                  onClick={async () => {
                    await removeCertification(instituteId, c.id);
                    onChanged();
                  }}
                  className="hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={newCert}
              placeholder={t('certificationTitle')}
              onChange={(e) => setNewCert(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={newCert.trim().length < 2}
              onClick={async () => {
                await addCertification(instituteId, teacherId, newCert.trim());
                setNewCert('');
                onChanged();
              }}
            >
              <Plus data-icon="inline-start" />
              {t('addCertification')}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('islamicKnowledge')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveDetails} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('studyDegree')}</Label>
              <Select
                value={form.studyDegree ?? ''}
                onValueChange={(v) => setForm({ ...form, studyDegree: v as StudyDegree })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('notSet')} />
                </SelectTrigger>
                <SelectContent>
                  {DEGREES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {tDeg(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="te-field">{t('studyField')}</Label>
              <Input
                id="te-field"
                value={form.studyField ?? ''}
                onChange={(e) => setForm({ ...form, studyField: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="te-parts">{t('quranParts')}</Label>
              <Input
                id="te-parts"
                type="number"
                min={0}
                max={30}
                value={form.quranPartsMemorized ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quranPartsMemorized:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('tajweedLevel')}</Label>
              <Select
                value={form.tajweedLevel ?? ''}
                onValueChange={(v) => setForm({ ...form, tajweedLevel: v as TajweedLevel })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('notSet')} />
                </SelectTrigger>
                <SelectContent>
                  {TAJWEED.map((l) => (
                    <SelectItem key={l} value={l}>
                      {tTaj(l)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? tc('loading') : tc('save')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
