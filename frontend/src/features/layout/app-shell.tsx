'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { User } from '@/lib/types';
import { getMe } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { InstituteProvider } from './institute-context';
import { Topbar } from './topbar';
import { SidebarNav } from './sidebar-nav';

import { registerPushSubscription } from '@/features/notifications/device-notifications';

/**
 * Authenticated app shell: loads the current user from the httpOnly-cookie
 * session (redirecting to /login if absent), then renders the topbar + a
 * persistent sidebar on desktop. Mobile uses the drawer inside the topbar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const tc = useTranslations('common');
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(({ user }) => {
        setUser(user);
        
        // Ensure service worker is registered and updating regardless of push permission
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
            reg.update().catch(() => {});
          }).catch(console.warn);
        }

        // Always attempt to register/refresh push subscription when app opens.
        registerPushSubscription();
      })
      .catch(() => router.replace('/login'));

    // Re-verify push subscription whenever user switches back to the app tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        registerPushSubscription();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  if (!user) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-muted-foreground">{tc('loading')}</p>
      </div>
    );
  }

  return (
    <InstituteProvider user={user}>
      <div className="flex min-h-dvh flex-col">
        <Topbar />
        <div className="flex flex-1">
          <aside className="bg-sidebar border-border hidden w-64 shrink-0 border-e lg:block">
            <SidebarNav />
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </InstituteProvider>
  );
}
