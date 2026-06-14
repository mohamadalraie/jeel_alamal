'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, GraduationCap } from 'lucide-react';
import type { User } from '@/lib/types';
import { deleteMember } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useTeachers, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/features/shared/data-table';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { EmptyState } from '@/features/shared/empty-state';
import { SearchInput } from '@/features/shared/search-input';
import { ListSkeleton } from '@/features/shared/skeletons';
import { AddMemberDialog } from '@/features/dashboard/add-member-dialog';

export default function TeachersPage() {
  const t = useTranslations('dashboard');
  const { selected, loading } = useInstitute();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: teachers, isLoading } = useTeachers(selected?.id);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = teachers ?? [];
    const q = search.trim();
    return q
      ? list.filter((m) => `${m.firstName} ${m.lastName} ${m.username}`.includes(q))
      : list;
  }, [teachers, search]);

  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const refresh = () => qc.invalidateQueries({ queryKey: qk.teachers(selected.id) });

  const columns: Column<User>[] = [
    { key: 'name', header: t('name'), cell: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'username', header: t('username'), cell: (r) => <span dir="ltr">{r.username}</span> },
    { key: 'phone', header: t('phone'), cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('teachers')}</h1>
        <AddMemberDialog
          instituteId={selected.id}
          role="teacher"
          onCreated={() => {
            refresh();
            notify.success(t('addTeacher'));
          }}
        />
      </div>

      <SearchInput value={search} onChange={setSearch} />

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title={search ? t('noData') : t('noData')} />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={(r) => router.push(`/dashboard/teachers/${r.id}`)}
          actions={(r) => (
            <ConfirmDialog
              onConfirm={async () => {
                await deleteMember(selected.id, r.id);
                refresh();
              }}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t('delete')}>
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
