'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  GraduationCap,
  Users,
  BookOpen,
  CheckCircle2,
  Award,
  Sparkles,
  TrendingUp,
  Flame,
  ShieldCheck,
} from 'lucide-react';
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
  AreaChart,
  Area,
} from 'recharts';
import { useRouter } from '@/i18n/navigation';
import { useInstitute } from '@/features/layout/institute-context';
import { useManagerAnalytics } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardsSkeleton } from '@/features/shared/skeletons';

const BRAND_COLORS = ['#BE9B5F', '#123B50', '#10B981', '#F59E0B'];

/** Comprehensive Institute Manager Analytics Hub */
export default function StatisticsPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const router = useRouter();
  const { selected, loading, user } = useInstitute();
  const { data: analytics, isLoading } = useManagerAnalytics(selected?.id);

  // Students and teachers don't have access to institute statistics.
  useEffect(() => {
    if (user.role === 'student') router.replace('/dashboard/my-profile');
    if (user.role === 'teacher') router.replace('/dashboard/teacher-dashboard');
  }, [user.role, router]);

  if (user.role === 'student' || user.role === 'teacher') return null;
  if (loading || isLoading) return <CardsSkeleton />;
  if (!selected) return <p className="text-muted-foreground">{t('selectInstituteFirst')}</p>;

  const kpiCards = [
    {
      label: 'نسبة الحضور العامة',
      value: `${analytics?.attendance.overallRate ?? 0}%`,
      subText: `${analytics?.attendance.present ?? 0} حضور من أصل ${analytics?.attendance.totalRecords ?? 0}`,
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
    {
      label: 'إجمالي التسميع القرآني',
      value: `${analytics?.recitation.totalAyahs ?? 0} آية`,
      subText: `${analytics?.recitation.totalSessions ?? 0} جلسة تسميع`,
      icon: BookOpen,
      color: 'text-amber-500',
    },
    {
      label: 'الدنانير التحفيزية الممنوحة',
      value: `${analytics?.dinars.totalAwarded ?? 0} د.ت`,
      subText: 'مكافآت التميز والحفظ والتزام الطلاب',
      icon: Award,
      color: 'text-yellow-500',
    },
    {
      label: 'الطلاب المسجلين',
      value: analytics?.counts.students ?? 0,
      subText: `في ${analytics?.counts.classes ?? 0} حلقة تعليمية`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'الكادر التدريسي',
      value: analytics?.counts.teachers ?? 0,
      subText: 'أساتذة ومعلمي القرآن الكريم',
      icon: GraduationCap,
      color: 'text-purple-500',
    },
  ];

  const quranPieData = analytics
    ? [
        { name: '0 - 9 أجزاء', value: analytics.quranProgress.zeroTo9Parts },
        { name: '10 - 19 جزء', value: analytics.quranProgress.tenTo19Parts },
        { name: '20 - 29 جزء', value: analytics.quranProgress.twentyTo29Parts },
        { name: 'خاتِم (30 جزء)', value: analytics.quranProgress.khatim },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <span>لوحة الإحصائيات وتقييم الأداء الشامل</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              متابعة واستعراض مؤشرات أداء المعهد: {selected.name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-semibold px-3 py-1">
          رؤية استراتيجية
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpiCards.map(({ label, value, subText, icon: Icon, color }) => (
          <Card key={label} className="border border-border/60 shadow-sm transition-all hover:shadow-md">
            <CardContent className="flex items-center gap-3.5 py-5 px-4">
              <div className="bg-muted/50 grid size-11 place-items-center rounded-xl shrink-0">
                <Icon className={`size-5 ${color}`} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-extrabold tabular-nums truncate">{value}</span>
                <span className="text-xs font-bold text-foreground truncate">{label}</span>
                <span className="text-[10px] text-muted-foreground truncate">{subText}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Attendance Trend & Quran Progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Attendance Trend Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" />
              <span>مخطط انضباط الحضور والغياب الأسبوعي</span>
            </CardTitle>
            <CardDescription className="text-xs">
              تطور إحصائيات الحضور والغياب في المعهد على مدار الأسابيع.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.attendanceTrend ?? []}>
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: 'currentColor' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} width={24} />
                <Tooltip />
                <Bar dataKey="present" name="حاضر" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="غائب" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="متأخر" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quran Progress Distribution */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-amber-500" />
              <span>توزيع الطلاب حسب أجزاء الحفظ القرآنية</span>
            </CardTitle>
            <CardDescription className="text-xs">
              نسبة الطلاب المنجزين لأجزاء القرآن الكريم في المعهد.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {quranPieData.length === 0 ? (
              <p className="text-muted-foreground text-xs">{tc('noData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quranPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {quranPieData.map((_, i) => (
                      <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards Row 2: Top Classes & Top Teachers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Performing Classes */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <span>ترتيب الحلقات الأكثر انضباطاً وتسميعاً</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!analytics?.topClasses || analytics.topClasses.length === 0) ? (
              <p className="text-muted-foreground text-xs text-center py-6">لا يوجد بيانات حلقات حالياً</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.topClasses.map((cls, idx) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="size-6 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground">{cls.name}</span>
                        <span className="text-muted-foreground block text-[11px]">
                          {cls.studentCount} طالب · {cls.totalAyahs} آية مسمّعة
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      {cls.attendanceRate}% حضور
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Active Teachers */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-purple-500" />
              <span>الأساتذة الأكثر نشاطاً وتكريماً للطلاب</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!analytics?.topTeachers || analytics.topTeachers.length === 0) ? (
              <p className="text-muted-foreground text-xs text-center py-6">لا يوجد بيانات أساتذة حالياً</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.topTeachers.map((tch, idx) => (
                  <div
                    key={tch.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="size-6 rounded-full bg-purple-500/10 text-purple-600 font-extrabold flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground">{tch.name}</span>
                        <span className="text-muted-foreground block text-[11px]">
                          يدير {tch.classesCount} حلقة قرآنية
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400">
                      {tch.dinarsAwarded} د.ت ممنوحة
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
