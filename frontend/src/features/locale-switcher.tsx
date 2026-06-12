'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

/**
 * Switches between Arabic and English while preserving the current path.
 * Navigation goes through next-intl's locale-aware router so the URL prefix and
 * document direction update together.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();

  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const label = other === 'ar' ? t('switchToArabic') : t('switchToEnglish');

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.replace(pathname, { locale: other })}
    >
      {label}
    </Button>
  );
}
