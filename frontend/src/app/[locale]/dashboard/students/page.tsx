'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Users } from 'lucide-react';
import type { User } from '@/lib/types';
import { deleteMember } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useStudents, useQueryClient, qk } from '@/lib/queries';
import { notify } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/features/shared/data-table';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { EmptyState } from '@/features/shared/empty-state';
import { SearchInput } from '@/features/shared/search-input';
import { ListSkeleton } from '@/features/shared/skeletons';
import { AddMemberDialog } from '@/features/dashboard/add-member-dialog';
import { GradeLabel } from '@/features/shared/grade-select';

export default function StudentsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { selected, loading } = useInstitute();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: students, isLoading } = useStudents(selected?.id);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = students ?? [];
    const q = search.trim();
    return q
      ? list.filter((m) => `${m.firstName} ${m.lastName} ${m.username}`.includes(q))
      : list;
  }, [students, search]);

  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const refresh = () => qc.invalidateQueries({ queryKey: qk.students(selected.id) });

  const columns: Column<User>[] = [
    { key: 'name', header: t('name'), cell: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'username', header: t('username'), cell: (r) => <span dir="ltr">{r.username}</span> },
    { key: 'phone', header: t('phone'), cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
    { key: 'schoolGrade', header: t('schoolGrade'), cell: (r) => <GradeLabel grade={r.schoolGrade} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('students')}</h1>
        <AddMemberDialog
          instituteId={selected.id}
          role="student"
          onCreated={() => {
            refresh();
            notify.success(t('addStudent'));
          }}
        />
      </div>

      <SearchInput value={search} onChange={setSearch} />

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={tc('noData')} />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={(r) => router.push(`/dashboard/students/${r.id}`)}
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
