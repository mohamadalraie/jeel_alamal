import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LoginForm } from '@/features/auth/login-form';
import { LocaleSwitcher } from '@/features/locale-switcher';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <header className="flex items-center justify-end">
        <LocaleSwitcher />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="text-secondary dark:text-primary text-3xl font-bold">
            {t('appName')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('tagline')}</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
