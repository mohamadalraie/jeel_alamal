'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { listTeachers, deleteMember, ApiError } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/features/shared/data-table';
import { ConfirmDialog } from '@/features/shared/confirm-dialog';
import { AddMemberDialog } from '@/features/dashboard/add-member-dialog';

export default function TeachersPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { selected, loading } = useInstitute();
  const [teachers, setTeachers] = useState<User[] | null>(null);
  const canManage = true; // server enforces; managers/super-admins reach here meaningfully

  const refresh = useCallback(() => {
    if (!selected) return;
    listTeachers(selected.id).then(setTeachers).catch(() => setTeachers([]));
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
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('teachers')}</h1>
        <AddMemberDialog instituteId={selected.id} role="teacher" onCreated={refresh} />
      </div>

      {teachers === null ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={teachers}
          onRowClick={(r) => router.push(`/dashboard/teachers/${r.id}`)}
          actions={
            canManage
              ? (r) => (
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
                )
              : undefined
          }
        />
      )}
    </div>
  );
}
