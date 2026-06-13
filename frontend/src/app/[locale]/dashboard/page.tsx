'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';

/** Landing redirect: super_admin → institutes, everyone else → teachers. */
export default function DashboardIndex() {
  const router = useRouter();
  const { user } = useInstitute();

  useEffect(() => {
    router.replace(
      user.role === 'super_admin' ? '/dashboard/institutes' : '/dashboard/teachers',
    );
  }, [router, user.role]);

  return null;
}
