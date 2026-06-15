'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Briefcase, GraduationCap, Users, BookOpen } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useStats, useClasses } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardsSkeleton } from '@/features/shared/skeletons';

const BRAND = ['#BE9B5F', '#123B50', '#8FAEBF', '#D9C49A'];

/** Institute statistics — post-login landing with counts + charts (spec 006). */
export default function StatisticsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { selected, loading, user } = useInstitute();
  const { data: stats, isLoading } = useStats(selected?.id);
  const { data: classes } = useClasses(selected?.id);

  // Students don't have access to institute statistics.
  useEffect(() => {
    if (user.role === 'student') router.replace('/dashboard/my-profile');
  }, [user.role, router]);

  if (user.role === 'student') return null;
  if (loading) return <CardsSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const cards = [
    { label: t('employees'), value: stats?.employees, icon: Briefcase },
    { label: t('teachers'), value: stats?.teachers, icon: GraduationCap },
    { label: t('students'), value: stats?.students, icon: Users },
    { label: t('classes'), value: stats?.classes, icon: BookOpen },
  ];

  const donut = stats
    ? [
        { name: t('employees'), value: stats.employees },
        { name: t('teachers'), value: stats.teachers },
        { name: t('students'), value: stats.students },
        { name: t('classes'), value: stats.classes },
      ]
    : [];

  const perClass = (classes ?? []).map((c) => ({
    name: c.name,
    [t('students')]: c.studentIds.length,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{t('statistics')}</h1>
        <span className="text-muted-foreground">— {selected.name}</span>
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 py-6">
                <div className="bg-muted grid size-12 place-items-center rounded-2xl">
                  <Icon className="text-primary size-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold tabular-nums">{value ?? '—'}</span>
                  <span className="text-muted-foreground text-sm">{label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('statistics')}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {donut.map((_, i) => (
                    <Cell key={i} fill={BRAND[i % BRAND.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('classes')} · {t('students')}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {perClass.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tc('noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perClass}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" width={24} />
                  <Tooltip />
                  <Bar dataKey={t('students')} fill="#BE9B5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
