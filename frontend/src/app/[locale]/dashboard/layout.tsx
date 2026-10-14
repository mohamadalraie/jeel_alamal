import { setRequestLocale } from 'next-intl/server';
import { AppShell } from '@/features/layout/app-shell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AppShell>{children}</AppShell>;
}
