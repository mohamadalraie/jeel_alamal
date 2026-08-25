'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInstitute } from '@/features/layout/institute-context';
import { useClasses } from '@/lib/queries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListSkeleton } from '@/features/shared/skeletons';
import { DinarLeaderboard } from '@/features/dinars/dinar-leaderboard';

const INSTITUTE = '__institute__';

/** Staff dinar leaderboard (spec 010): institute-wide (managers) or per class. */
export default function DinarLeaderboardPage() {
  const t = useTranslations('dinars');
  const td = useTranslations('dashboard');
  const { selected, loading, user } = useInstitute();
  const { data: classes = [] } = useClasses(selected?.id);

  const isManager = user.role === 'institute_manager' || user.role === 'super_admin';
  const [scope, setScope] = useState<string>(isManager ? INSTITUTE : '');

  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{td('selectInstituteFirst')}</p>;

  const classId = scope === INSTITUTE || scope === '' ? undefined : scope;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('leaderboard')}</h1>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t('selectScope')} />
          </SelectTrigger>
          <SelectContent>
            {isManager && <SelectItem value={INSTITUTE}>{t('instituteWide')}</SelectItem>}
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scope === '' ? (
        <p className="text-muted-foreground text-sm">{t('pickScopeHint')}</p>
      ) : (
        <DinarLeaderboard instituteId={selected.id} classId={classId} />
      )}
    </div>
  );
}
