'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getHealth } from '@/lib/api';

/**
 * Pings the backend /health endpoint to prove the frontend↔backend wiring works
 * end-to-end through Docker. Demonstrative — a real app would use React Query.
 */
export function BackendStatus() {
  const t = useTranslations('home');
  const [state, setState] = useState<'checking' | 'online' | 'offline'>(
    'checking',
  );

  useEffect(() => {
    let active = true;
    getHealth()
      .then((h) => active && setState(h.db === 'up' ? 'online' : 'offline'))
      .catch(() => active && setState('offline'));
    return () => {
      active = false;
    };
  }, []);

  const color =
    state === 'online'
      ? 'bg-green-500'
      : state === 'offline'
        ? 'bg-red-500'
        : 'bg-amber-400';

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span>
        {t('backendStatus')}: {t(state)}
      </span>
    </div>
  );
}
