'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, CheckCircle2, Award, Sparkles, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useStudentAnalytics } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardsSkeleton } from '@/features/shared/skeletons';
import { formatDateLocale } from '@/lib/utils';

const COLORS = ['#BE9B5F', '#123B50', '#10B981', '#F59E0B'];

export function StudentAnalyticsView({
  instituteId,
  studentId,
}: {
  instituteId: string;
  studentId?: string;
}) {
  const t = useTranslations('dashboard');
  const { data: analytics, isLoading } = useStudentAnalytics(instituteId, studentId);

  if (isLoading || !analytics) return <CardsSkeleton />;

  const kpis = [
    {
      label: 'مستوى التسميع والتلاوة',
      value: `${analytics.recitation.estimatedParts} جزء`,
      subText: `${analytics.recitation.totalAyahs} آية مسمّعة`,
      icon: BookOpen,
      color: 'text-amber-500',
    },
    {
      label: 'نسبة الحضور الشخصي',
      value: `${analytics.attendance.rate}%`,
      subText: `${analytics.attendance.present} من أصل ${analytics.attendance.totalSessions} جلسة`,
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
    {
      label: 'رصيد الدنانير',
      value: `${analytics.dinars.balance} د`,
      subText: `ترتيب الطالب بالحلقة: #${analytics.dinars.rankInClass ?? 1}`,
      icon: Award,
      color: 'text-yellow-500',
    },
  ];

  const pieData = [
    { name: 'الدروس', value: analytics.dinars.contextBreakdown.lesson ?? 0 },
    { name: 'التسميع', value: analytics.dinars.contextBreakdown.recitation ?? 0 },
    { name: 'الحضور', value: analytics.dinars.contextBreakdown.attendance ?? 0 },
    { name: 'عام وتكريم', value: analytics.dinars.contextBreakdown.general ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Student Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{analytics.studentInfo.name}</h2>
            <p className="text-xs text-muted-foreground">
              {analytics.studentInfo.className ? `الحلقة: ${analytics.studentInfo.className}` : 'لوحة تتبع إنجاز الطالب'}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1">
          إنجاز مميز
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map(({ label, value, subText, icon: Icon, color }) => (
          <Card key={label} className="border border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="bg-muted/50 grid size-12 place-items-center rounded-2xl shrink-0">
                <Icon className={`size-6 ${color}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tabular-nums">{value}</span>
                <span className="text-xs font-bold text-foreground">{label}</span>
                <span className="text-[11px] text-muted-foreground">{subText}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Daily Recitation History Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <span>سجل التسميع اليومي (آخر 30 يوماً)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              عدد الآيات التي تم تسميعها يومياً للحلقة.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {analytics.dailyRecitationHistory.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-12">لا يوجد بيانات تسميع مسجلة مؤخراً</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyRecitationHistory}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    tickFormatter={(val) =>
                      new Date(val).toLocaleDateString(formatDateLocale('ar'), {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'currentColor' }} width={24} />
                  <Tooltip
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString(formatDateLocale('ar'), {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    }
                  />
                  <Bar dataKey="ayahs" name="الآيات" fill="#BE9B5F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Dinar Breakdown Pie Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award className="size-4 text-yellow-500" />
              <span>تحليل مكافآت الدنانير</span>
            </CardTitle>
            <CardDescription className="text-xs">
              توزيع الدنانير المكتسبة حسب نوع النشاط والمشاركة.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center">لم يتم إسناد دنانير بعد</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    label={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${val} د`, 'المكافأة']} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
