'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Users, Zap } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StudentsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { selected, loading } = useInstitute();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: students, isLoading } = useStudents(selected?.id);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'regular' | 'intensive'>('all');

  const filtered = useMemo(() => {
    let list = students ?? [];
    if (tabFilter === 'intensive') {
      list = list.filter((m) => m.isIntensive);
    } else if (tabFilter === 'regular') {
      list = list.filter((m) => !m.isIntensive);
    }
    const q = search.trim();
    return q
      ? list.filter((m) => `${m.firstName} ${m.lastName} ${m.username}`.includes(q))
      : list;
  }, [students, search, tabFilter]);

  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const refresh = () => qc.invalidateQueries({ queryKey: qk.students(selected.id) });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t('name'),
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{`${r.firstName} ${r.lastName}`}</span>
          {r.isIntensive && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0"
              title="طالب بالمسار المكثف"
            >
              <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span>مكثف</span>
            </span>
          )}
        </div>
      ),
    },
    { key: 'username', header: t('username'), cell: (r) => <span dir="ltr">{r.username}</span> },
    { key: 'phone', header: t('phone'), cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
    { key: 'schoolGrade', header: t('schoolGrade'), cell: (r) => <GradeLabel grade={r.schoolGrade} /> },
    ...(selected.intensiveTrackEnabled
      ? [
          {
            key: 'track',
            header: 'المسار',
            cell: (r: User) =>
              r.isIntensive ? (
                <span className="inline-flex items-center gap-1 font-semibold text-xs text-amber-600 dark:text-amber-400">
                  <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>المسار المكثف</span>
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">الأساسي فقط</span>
              ),
          },
        ]
      : []),
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} />
        {selected.intensiveTrackEnabled && (
          <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as any)} className="shrink-0">
            <TabsList>
              <TabsTrigger value="all">{tc('all') || 'الكل'}</TabsTrigger>
              <TabsTrigger value="regular">الأساسي</TabsTrigger>
              <TabsTrigger value="intensive" className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>المكثف</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

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
