import { setRequestLocale, getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/features/locale-switcher';
import { BackendStatus } from '@/features/backend-status';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Amiri } from 'next/font/google';

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
});

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-gradient-to-b from-[#1d526e] via-[#123b50] to-[#091e2b] dark:bg-transparent flex flex-col">
      {/* Damascene Window Ornament Lattice (زخرفة حديد/خشب الشباك الدمشقي المفرغ) Ultra-Low Contrast */}
      <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none text-white overflow-hidden">
        <svg className="w-full h-full" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="damascene-lattice-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              {/* Outer Damascene Diamond Mesh */}
              <path d="M 40 0 L 80 40 L 40 80 L 0 40 Z" fill="none" stroke="currentColor" strokeWidth="0.7" />

              {/* Central Damascene Floral Rosette Ornament */}
              <circle cx="40" cy="40" r="7" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="40" cy="40" r="2.5" fill="none" stroke="currentColor" strokeWidth="0.5" />
              
              {/* 4 Petal Swirls branching inside diamond */}
              <path d="M 40 18 Q 33 29 40 33 Q 47 29 40 18 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 40 62 Q 33 51 40 47 Q 47 51 40 62 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 18 40 Q 29 33 33 40 Q 29 47 18 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <path d="M 62 40 Q 51 33 47 40 Q 51 47 62 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />

              {/* Corner Intersecting Rosettes for Seamless Repeating Mesh */}
              <path d="M 0 0 L 80 80 M 80 0 L 0 80" stroke="currentColor" strokeWidth="0.4" />
              <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="80" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="0" cy="80" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="80" cy="80" r="5" fill="none" stroke="currentColor" strokeWidth="0.6" />
              <circle cx="40" cy="0" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="0" cy="40" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="80" cy="40" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="40" cy="80" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#damascene-lattice-pattern)" />
        </svg>
      </div>

      <main className="relative z-10 mx-auto flex flex-1 w-full max-w-md flex-col px-5 py-6 justify-center">
        <section className="flex flex-col items-center justify-center w-full">
          <div className="relative flex w-full flex-col items-center justify-center gap-3.5 rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-6 pb-8 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
            {/* Liquid Glass Highlight */}
            <div className="absolute inset-x-0 top-0 h-24 rounded-t-[2.5rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            {/* Locale Switcher inside the card */}
            <div className="absolute top-4 right-4 z-20">
              <LocaleSwitcher />
            </div>

            {/* Logo container with tight padding & no extra margins */}
            <div className="z-10 mt-1 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="شعار المنشية"
                width={200}
                height={200}
                className="h-28 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>

            <h1 className="z-10 text-white text-2xl font-extrabold drop-shadow-md leading-snug text-center">
              مرحبا بك في دورة
              <span className="mt-2 block text-4xl text-[#e8c37d] drop-shadow-lg font-bold">جيل العمل</span>
            </h1>

            {/* Elegant Quranic Verse in Amiri Font */}
            <div className="z-10 flex flex-col items-center justify-center my-2 py-3 px-4 border-y border-[#e8c37d]/20 w-full bg-white/[0.02] rounded-xl shadow-sm">
              <p className={`${amiri.className} text-[#e8c37d] text-center text-xl sm:text-2xl font-bold leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]`}>
                ﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾
              </p>
              <span className="text-white/40 text-[11px] mt-1 font-sans">[المجادلة: 11]</span>
            </div>

            <Button size="lg" className="z-10 h-13 w-full rounded-2xl text-base mt-2 shadow-xl hover:shadow-2xl transition-all border border-white/10 bg-gradient-to-r from-[#e8c37d] to-[#d4b06b] hover:from-[#d4b06b] hover:to-[#c29e5a] text-[#123b50] font-bold" asChild>
              <Link href="/login">{t('exploreCourses')}</Link>
            </Button>
          </div>
        </section>

        <footer className="flex justify-center pt-6 pb-2">
          <BackendStatus />
        </footer>
      </main>
    </div>
  );
}
