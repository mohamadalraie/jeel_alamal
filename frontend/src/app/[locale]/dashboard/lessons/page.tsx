'use client';

import { useTranslations } from 'next-intl';
import { useInstitute } from '@/features/layout/institute-context';
import { InstituteLessonsHub } from '@/features/lessons/institute-lessons-hub';
import { ListSkeleton } from '@/features/shared/skeletons';

/** Manager hub for the institute-wide lessons program (spec 008). */
export default function LessonsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { selected, loading, user } = useInstitute();

  // Managers and the super admin manage lessons here.
  if (user.role !== 'institute_manager' && user.role !== 'super_admin') {
    return <p className="text-muted-foreground">{tc('error')}</p>;
  }
  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  return <InstituteLessonsHub instituteId={selected.id} />;
}
