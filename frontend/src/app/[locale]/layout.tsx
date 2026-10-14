import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getMessages, getTranslations } from 'next-intl/server';
import { getLangDir } from 'rtl-detect';
import { Tajawal } from 'next/font/google';
import { Toaster } from 'sonner';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/features/layout/theme-provider';
import { QueryProvider } from '@/features/layout/query-provider';
import { PwaInstallBanner } from '@/components/pwa/pwa-install-banner';
import '../globals.css';

// Tajawal — a friendly, modern family covering Arabic + Latin (spec 003).
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
});

export const dynamic = 'force-dynamic';

// Mobile-first viewport.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ef' },
    { media: '(prefers-color-scheme: dark)', color: '#081a24' },
  ],
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
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'جيل العمل',
      startupImage: ['/hero-bg.png'],
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
        { url: '/logo.png', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
      apple: [
        { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
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
      className={`${tajawal.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider dir={direction}>
            <QueryProvider>
              {children}
              <PwaInstallBanner />
              <Toaster richColors position="top-center" dir={direction} />
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
