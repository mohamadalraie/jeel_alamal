'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ClassRecitation, Surah } from '@/lib/types';
import { getClassRecitation, listSurahs } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddRecitationDialog } from './add-recitation-dialog';
import { RecitationLog } from './recitation-log';

/** Class profile "التسميع" tab: every student's recitation log + recite button. */
export function ClassRecitationTab({ classId }: { classId: string }) {
  const t = useTranslations('recitation');
  const tc = useTranslations('common');
  const [data, setData] = useState<ClassRecitation | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);

  const load = useCallback(() => {
    getClassRecitation(classId).then(setData).catch(() => setData(null));
  }, [classId]);
  useEffect(() => {
    load();
    listSurahs().then(setSurahs).catch(() => setSurahs([]));
  }, [load]);

  if (!data) return <p className="text-muted-foreground">{tc('loading')}</p>;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('log')}</CardTitle>
        {data.students.length > 0 && (
          <AddRecitationDialog surahs={surahs} students={data.students} onDone={load} />
        )}
      </CardHeader>
      <CardContent>
        <RecitationLog items={data.log} showStudent />
      </CardContent>
    </Card>
  );
}
