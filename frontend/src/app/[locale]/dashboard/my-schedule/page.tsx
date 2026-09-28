'use client';

import { useTranslations } from 'next-intl';
import { useInstitute } from '@/features/layout/institute-context';
import { StudentWeeklyPlanView } from '@/features/classes/student-weekly-plan';

export default function MySchedulePage() {
  const t = useTranslations('dashboard');
  const { selected, user } = useInstitute();

  if (!selected) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        {t('selectInstituteFirst')}
      </div>
    );
  }

  if (user.role !== 'student') {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Only students can access this page
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground/90">
          {t('weeklySchedule') || 'البرنامج الأسبوعي'}
        </h1>
        <p className="text-muted-foreground mt-2">
          يُظهر هذا البرنامج الأسبوعي دروسك وحلقاتك المجدولة، بالإضافة لجلسات التسميع.
        </p>
      </div>

      <StudentWeeklyPlanView instituteId={selected.id} />
    </div>
  );
}
