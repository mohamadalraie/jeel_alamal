'use client';

import { useTranslations } from 'next-intl';
import {
  Users,
  AlertTriangle,
  Award,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useTeacherAnalytics } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardsSkeleton } from '@/features/shared/skeletons';

export function TeacherAnalyticsView({
  instituteId,
  teacherId,
}: {
  instituteId: string;
  teacherId?: string;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { data: analytics, isLoading } = useTeacherAnalytics(instituteId, teacherId);

  if (isLoading || !analytics) return <CardsSkeleton />;

  const kpis = [
    {
      label: 'نسبة حضور الطلاب',
      value: `${analytics.classAttendanceRate}%`,
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
    {
      label: 'إجمالي طلاب الحلقة',
      value: analytics.totalStudents,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'تسميعات تم إقرارها',
      value: analytics.totalRecitationsVerified,
      icon: BookOpen,
      color: 'text-amber-500',
    },
    {
      label: 'دنانير ممنوحة لطلابه',
      value: analytics.totalDinarsAwarded,
      icon: Award,
      color: 'text-yellow-500',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Teacher Header */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            <GraduationCap className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{analytics.teacherInfo.name}</h2>
            <p className="text-xs text-muted-foreground">
              لوحة متابعة وإحصائيات أداء الأستاذ والطلاب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {analytics.assignedClasses.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs">
              {c.name} ({c.studentCount} طالب)
            </Badge>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border border-border/60 shadow-sm">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="bg-muted/50 grid size-11 place-items-center rounded-xl shrink-0">
                <Icon className={`size-5 ${color}`} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tabular-nums">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attention Needed Alert Section */}
      {analytics.studentsNeedingAttention.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              <span>طلاب يحتاجون إلى متابعة فورية ({analytics.studentsNeedingAttention.length})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              الطلاب الذين تنخفض نسبة حضورهم عن 80% أو انقطعوا عن التسميع لأكثر من 3 أيام.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analytics.studentsNeedingAttention.map((s) => (
                <div
                  key={s.studentId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-amber-500/20 bg-background/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <span className="text-muted-foreground block text-[11px]">
                      {s.className} · {s.reason}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                    {s.attendanceRate}% حضور
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roster Performance Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span>جدول تقييم أداء طلاب الحلقة</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.studentsPerformance.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-6">لا يوجد طلاب بالحلقة حالياً</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground bg-muted/30">
                    <th className="p-2.5 text-start font-semibold">اسم الطالب</th>
                    <th className="p-2.5 text-start font-semibold">الحلقة</th>
                    <th className="p-2.5 text-center font-semibold">نسبة الحضور</th>
                    <th className="p-2.5 text-center font-semibold">آيات التسميع</th>
                    <th className="p-2.5 text-center font-semibold">رصيد الدنانير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {analytics.studentsPerformance.map((st) => (
                    <tr key={st.studentId} className="hover:bg-muted/20 transition-colors">
                      <td className="p-2.5 font-medium text-foreground">{st.name}</td>
                      <td className="p-2.5 text-muted-foreground">{st.className}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            st.attendanceRate >= 85
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : st.attendanceRate >= 70
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {st.attendanceRate}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center tabular-nums font-semibold">{st.totalAyahs} آية</td>
                      <td className="p-2.5 text-center tabular-nums text-yellow-600 dark:text-yellow-400 font-bold">
                        {st.dinarsBalance} د.ت
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
