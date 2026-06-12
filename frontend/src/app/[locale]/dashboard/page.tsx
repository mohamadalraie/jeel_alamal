import { setRequestLocale } from 'next-intl/server';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardShell />;
}
