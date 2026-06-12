import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getMessages, getTranslations } from 'next-intl/server';
import { getLangDir } from 'rtl-detect';
import { Cairo } from 'next/font/google';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Cairo supports both Arabic and Latin — one font for both locales.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
});

// Pre-render both locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Mobile-first viewport.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#123b50',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  return {
    title: t('appName'),
    description: t('tagline'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate the incoming locale; 404 on anything unsupported.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering for this request.
  setRequestLocale(locale);

  const direction = getLangDir(locale); // 'rtl' for ar, 'ltr' for en
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
