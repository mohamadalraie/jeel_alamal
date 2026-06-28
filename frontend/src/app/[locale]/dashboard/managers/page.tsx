'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, ShieldCheck } from 'lucide-react';
import type { User } from '@/lib/types';
import { removeManager } from '@/lib/api';
import { useInstitute } from '@/features/layout/institute-context';
import { useManagers, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/features/shared/data-table';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { EmptyState } from '@/features/shared/empty-state';
import { SearchInput } from '@/features/shared/search-input';
import { ListSkeleton } from '@/features/shared/skeletons';
import { AddMemberDialog } from '@/features/dashboard/add-member-dialog';

/** Managers of the selected institute (an institute may have several). */
export default function ManagersPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { selected, loading, user } = useInstitute();
  const qc = useQueryClient();
  const { data: managers, isLoading } = useManagers(selected?.id);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = managers ?? [];
    const q = search.trim();
    return q
      ? list.filter((m) => `${m.firstName} ${m.lastName} ${m.username}`.includes(q))
      : list;
  }, [managers, search]);

  // Only managers and the super admin manage managers.
  if (user.role !== 'institute_manager' && user.role !== 'super_admin') {
    return <p className="text-muted-foreground">{tc('error')}</p>;
  }
  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const refresh = () => qc.invalidateQueries({ queryKey: qk.managers(selected.id) });

  const columns: Column<User>[] = [
    { key: 'name', header: t('name'), cell: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'username', header: t('username'), cell: (r) => <span dir="ltr">{r.username}</span> },
    { key: 'phone', header: t('phone'), cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('managers')}</h1>
        <AddMemberDialog
          instituteId={selected.id}
          role="manager"
          onCreated={() => {
            refresh();
            notify.success(t('addManager'));
          }}
        />
      </div>

      <SearchInput value={search} onChange={setSearch} />

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t('noData')} />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          actions={(r) => (
            <ConfirmDialog
              title={t('removeManager')}
              message={t('removeManagerMsg')}
              onConfirm={async () => {
                try {
                  await removeManager(selected.id, r.id);
                  refresh();
                  notify.success(t('removeManager'));
                } catch (err) {
                  notify.error(err, tc('error'));
                }
              }}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t('removeManager')}>
                  <Trash2 className="text-destructive" />
                </Button>
              }
            />
          )}
        />
      )}
    </div>
  );
}
