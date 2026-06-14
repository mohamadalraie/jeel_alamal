'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { StudentRecitation, Surah } from '@/lib/types';
import { getStudentRecitation, listSurahs } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddRecitationDialog } from './add-recitation-dialog';
import { HeartMap } from './heart-map';
import { RecitationLog } from './recitation-log';

/** Student profile "تسميع القرآن" tab: summary + memorization map + recite + log. */
export function StudentRecitationTab({ studentId }: { studentId: string }) {
  const t = useTranslations('recitation');
  const tc = useTranslations('common');
  const tr = useTranslations('ratings');
  const locale = useLocale();
  const [data, setData] = useState<StudentRecitation | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);

  const load = useCallback(() => {
    getStudentRecitation(studentId).then(setData).catch(() => setData(null));
  }, [studentId]);
  useEffect(() => {
    load();
    listSurahs().then(setSurahs).catch(() => setSurahs([]));
  }, [load]);

  if (!data) return <p className="text-muted-foreground">{tc('loading')}</p>;

  const { summary, heart, log } = data;
  const last = summary.lastRecitation;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <AddRecitationDialog surahs={surahs} studentId={studentId} onDone={load} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('fullCount')} value={summary.fullCount} />
        <Stat label={t('partialCount')} value={summary.partialCount} />
        <Stat label={t('totalRecitations')} value={summary.totalRecitations} />
        <Card>
          <CardContent className="flex flex-col gap-0.5 py-4">
            <span className="text-muted-foreground text-xs">{t('lastRecitation')}</span>
            {last ? (
              <>
                <span className="text-sm font-semibold">{last.surahName}</span>
                <span className="text-muted-foreground text-xs">
                  {last.fromAyah}–{last.toAyah} · {tr(last.rating)} ·{' '}
                  {new Date(last.createdAt).toLocaleDateString(locale)}
                </span>
              </>
            ) : (
              <span className="text-sm">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Memorization map */}
      <Card>
        <CardHeader>
          <CardTitle>{t('memorizationMap')}</CardTitle>
        </CardHeader>
        <CardContent>
          <HeartMap cells={heart} />
        </CardContent>
      </Card>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>{t('log')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecitationLog items={log} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 py-4">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </CardContent>
    </Card>
  );
}
