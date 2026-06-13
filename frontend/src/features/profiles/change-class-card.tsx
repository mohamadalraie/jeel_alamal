'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ClassItem } from '@/lib/types';
import { listClasses, changeStudentClass, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = '__none__';

/** Shows the student's current class and lets staff transfer them (one at a time). */
export function ChangeClassCard({
  instituteId,
  studentId,
  currentClass,
  onChanged,
}: {
  instituteId: string;
  studentId: string;
  currentClass: { id: string; name: string } | null;
  onChanged: () => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [value, setValue] = useState<string>(currentClass?.id ?? NONE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClasses(instituteId).then(setClasses).catch(() => setClasses([]));
  }, [instituteId]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await changeStudentClass(instituteId, studentId, value === NONE ? null : value);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const dirty = value !== (currentClass?.id ?? NONE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('currentClass')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">{t('changeClass')}</span>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('noClass')}</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={!dirty || busy}>
          {busy ? tc('loading') : tc('save')}
        </Button>
      </CardContent>
      {error && (
        <p role="alert" className="text-destructive px-6 pb-4 text-sm">
          {error}
        </p>
      )}
    </Card>
  );
}
