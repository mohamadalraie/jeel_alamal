'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import type { ClassItem } from '@/lib/types';
import { listClasses, addIntensiveStudent, removeIntensiveStudent, ApiError } from '@/lib/api';
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

export function IntensiveClassCard({
  instituteId,
  studentId,
  intensiveClass,
  onChanged,
}: {
  instituteId: string;
  studentId: string;
  intensiveClass: { id: string; name: string } | null;
  onChanged: () => void;
}) {
  const tc = useTranslations('common');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [value, setValue] = useState<string>(intensiveClass?.id ?? NONE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(intensiveClass?.id ?? NONE);
  }, [intensiveClass]);

  useEffect(() => {
    listClasses(instituteId).then(setClasses).catch(() => setClasses([]));
  }, [instituteId]);

  const intensiveClasses = classes.filter((c) => c.isIntensive);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (intensiveClass && intensiveClass.id !== value) {
        await removeIntensiveStudent(intensiveClass.id, studentId);
      }
      if (value !== NONE && value !== intensiveClass?.id) {
        await addIntensiveStudent(value, studentId);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  const dirty = value !== (intensiveClass?.id ?? NONE);

  return (
    <Card className="border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Zap className="h-5 w-5 fill-amber-500 text-amber-500" />
          <span>الحلقة المكثفة</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">تعيين أو تغيير الحلقة المكثفة للطالب</span>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>غير مسجل في حلقة مكثفة</SelectItem>
              {intensiveClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  ⚡ {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={!dirty || busy} className="bg-amber-600 hover:bg-amber-700 text-white">
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
