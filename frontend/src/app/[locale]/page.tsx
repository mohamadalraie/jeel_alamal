import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/features/locale-switcher';
import { BackendStatus } from '@/features/backend-status';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <header className="flex items-center justify-end">
        <LocaleSwitcher />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-secondary dark:text-primary text-3xl font-bold">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-base">{t('subtitle')}</p>

        <Button size="lg" className="h-14 w-full rounded-2xl text-lg" asChild>
          <Link href="/login">{t('exploreCourses')}</Link>
        </Button>
      </section>

      <footer className="flex justify-center pt-8">
        <BackendStatus />
      </footer>
    </main>
  );
}
