'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { listStudents, deleteMember, ApiError } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/features/shared/data-table';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { AddMemberDialog } from '@/features/dashboard/add-member-dialog';
import { GradeLabel } from '@/features/shared/grade-select';

export default function StudentsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { selected, loading } = useInstitute();
  const [students, setStudents] = useState<User[] | null>(null);

  const refresh = useCallback(() => {
    if (!selected) return;
    listStudents(selected.id).then(setStudents).catch(() => setStudents([]));
  }, [selected]);
  useEffect(refresh, [refresh]);

  if (loading) return <p className="text-muted-foreground">{tc('loading')}</p>;
  if (!selected)
    return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t('name'),
      cell: (r) => (
        <span className="font-medium">
          {r.firstName} {r.lastName}
        </span>
      ),
    },
    { key: 'username', header: t('username'), cell: (r) => <span dir="ltr">{r.username}</span> },
    { key: 'phone', header: t('phone'), cell: (r) => <span dir="ltr">{r.phone ?? '—'}</span> },
    { key: 'schoolGrade', header: t('schoolGrade'), cell: (r) => <GradeLabel grade={r.schoolGrade} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('students')}</h1>
        <AddMemberDialog instituteId={selected.id} role="student" onCreated={refresh} />
      </div>

      {students === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={students}
          onRowClick={(r) => router.push(`/dashboard/students/${r.id}`)}
          actions={(r) => (
            <ConfirmDialog
              onConfirm={async () => {
                try {
                  await deleteMember(selected.id, r.id);
                  refresh();
                } catch (err) {
                  if (err instanceof ApiError) alert(err.message);
                }
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
