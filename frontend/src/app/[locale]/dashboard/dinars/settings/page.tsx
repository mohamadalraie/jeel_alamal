'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/features/shared/skeletons';
import { DinarRulesManager } from '@/features/dinars/dinar-rules-manager';

/** Manager dinar rules configuration (spec 010): manual rules + system rules. */
export default function DinarSettingsPage() {
  const t = useTranslations('dinars');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const locale = useLocale();
  const { selected, loading, user } = useInstitute();
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;

  if (user.role !== 'institute_manager' && user.role !== 'super_admin') {
    return <p className="text-muted-foreground">{tc('error')}</p>;
  }
  if (loading) return <ListSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{td('selectInstituteFirst')}</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label={td('back')}>
          <Link href="/dashboard">
            <Back className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{t('rulesTitle')}</h1>
      </div>
      <DinarRulesManager instituteId={selected.id} />
    </div>
  );
}
