'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';

/** Landing redirect: super_admin → institutes, everyone else → teachers. */
export default function DashboardIndex() {
  const router = useRouter();
  const { user } = useInstitute();

  useEffect(() => {
    // Statistics is the post-login landing for every role (spec 004).
    router.replace('/dashboard/statistics');
  }, [router, user.role]);

  return null;
}
