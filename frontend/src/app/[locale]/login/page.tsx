import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/features/auth/login-form';
import { LocaleSwitcher } from '@/features/locale-switcher';
import { BackendStatus } from '@/features/backend-status';
import Image from 'next/image';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-b from-[#1d526e] via-[#123b50] to-[#091e2b] dark:bg-transparent flex flex-col">
      {/* Damascene Window Ornament Lattice Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none text-white overflow-hidden">
        <svg className="w-full h-full" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="damascene-lattice-pattern-login" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 80 40 L 40 80 L 0 40 Z" fill="none" stroke="currentColor" strokeWidth="0.7" />
              <circle cx="40" cy="40" r="7" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="40" cy="40" r="2.5" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 40 18 Q 33 29 40 33 Q 47 29 40 18 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 40 62 Q 33 51 40 47 Q 47 51 40 62 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 18 40 Q 29 33 33 40 Q 29 47 18 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 62 40 Q 51 33 47 40 Q 51 47 62 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 0 0 L 80 80 M 80 0 L 0 80" stroke="currentColor" strokeWidth="0.4" />
              <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="80" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="0" cy="80" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="80" cy="80" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#damascene-lattice-pattern-login)" />
        </svg>
      </div>

      <main className="relative z-10 mx-auto flex flex-1 w-full max-w-md flex-col px-5 py-6 justify-center">
        <section className="flex flex-col items-center justify-center w-full">
          <div className="relative flex w-full flex-col items-center justify-center gap-4 rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 pb-8 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
            {/* Liquid Glass Highlight */}
            <div className="absolute inset-x-0 top-0 h-24 rounded-t-[2.5rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            {/* Locale Switcher inside card */}
            <div className="absolute top-4 right-4 z-20">
              <LocaleSwitcher />
            </div>

            {/* Logo */}
            <div className="z-10 mt-1 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="شعار المنشية"
                width={200}
                height={200}
                className="h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>

            <LoginForm />
          </div>
        </section>

        <footer className="flex justify-center pt-6 pb-2">
          <BackendStatus />
        </footer>
      </main>
    </div>
  );
}
