import { defineRouting } from 'next-intl/routing';

/**
 * Central routing config for next-intl.
 * - `ar` (Arabic, RTL) is the default locale for جيل العمل.
 * - `en` (English, LTR) is the secondary locale.
 * The `[locale]` path segment is prefixed for all routes (e.g. /ar, /en/courses).
 */
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
