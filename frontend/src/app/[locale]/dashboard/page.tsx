'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';

export default function DashboardIndex() {
  const router = useRouter();
  const { user } = useInstitute();

  useEffect(() => {
    if (user.role === 'student') {
      router.replace('/dashboard/my-profile');
    } else {
      router.replace('/dashboard/statistics');
    }
  }, [router, user.role]);

  return null;
}
