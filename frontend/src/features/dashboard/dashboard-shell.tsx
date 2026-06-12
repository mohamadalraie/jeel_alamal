'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { User } from '@/lib/types';
import { getMe, logout } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocaleSwitcher } from '@/features/locale-switcher';
import { SuperAdminView } from './super-admin-view';
import { ManagerView } from './manager-view';

/**
 * Authenticated shell: loads the current user from the httpOnly-cookie
 * session, redirects to login when unauthenticated, and renders the
 * role-appropriate view (hiding is UX — the API enforces permissions).
 */
export function DashboardShell() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(({ user }) => setUser(user))
      .catch(() => router.replace('/login'));
  }, [router]);

  if (!user) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-5 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-secondary dark:text-primary text-xl font-bold">
            {tc('appName')}
          </h1>
          <Badge>{tr(user.role)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout().catch(() => undefined);
              router.replace('/login');
            }}
          >
            {tc('logout')}
          </Button>
        </div>
      </header>

      <p className="text-muted-foreground">
        {t('welcome', { name: `${user.firstName} ${user.lastName}` })}
      </p>

      {user.role === 'super_admin' ? (
        <SuperAdminView />
      ) : user.role === 'institute_manager' ? (
        <ManagerView user={user} />
      ) : (
        <p className="text-muted-foreground">{t('comingSoon')}</p>
      )}
    </main>
  );
}
