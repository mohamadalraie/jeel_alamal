'use client';

import { useTranslations } from 'next-intl';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { TeacherLessonsProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  finished: { label: 'مكتمل', variant: 'default' },
  over_time: { label: 'تجاوز الوقت', variant: 'secondary' },
  under_time: { label: 'أقل من المتوقع', variant: 'secondary' },
  pending: { label: 'قادم', variant: 'outline' },
  started: { label: 'جارٍ', variant: 'default' },
};

const KIND_LABELS: Record<string, string> = {
  lesson: 'درس',
  recitation: 'تسميع',
};

interface Props {
  data: TeacherLessonsProfile;
}

export function TeacherLessonsCard({ data }: Props) {
  const { stats, lessons } = data;
  const [showAll, setShowAll] = useState(false);

  const sorted = [...lessons].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const displayed = showAll ? sorted : sorted.slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<BookOpen className="w-4 h-4" />}
          label="إجمالي الدروس"
          value={String(stats.totalLessons)}
          color="text-blue-500"
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="دروس مكتملة"
          value={String(stats.finishedLessons)}
          color="text-emerald-500"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="نسبة الإنجاز"
          value={`${stats.completionRate}%`}
          color="text-amber-500"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="متوسط مدة الدرس"
          value={stats.averageDurationMinutes != null ? `${stats.averageDurationMinutes} د` : '—'}
          color="text-violet-500"
        />
      </div>

      {/* Lessons List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            سجل الدروس
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lessons.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">لا توجد دروس بعد</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {displayed.map((lesson) => {
                  const statusInfo = STATUS_LABELS[lesson.status] ?? {
                    label: lesson.status,
                    variant: 'outline' as const,
                  };
                  return (
                    <div
                      key={lesson.lessonClassId}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-medium text-sm truncate">
                          {lesson.name ?? KIND_LABELS[lesson.kind] ?? lesson.kind}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(lesson.date).toLocaleDateString('ar', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {lesson.className}
                          </span>
                          {lesson.category && (
                            <span
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                background: `${lesson.category.color}22`,
                                color: lesson.category.color,
                              }}
                            >
                              {lesson.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant={statusInfo.variant} className="text-[11px] h-5">
                          {statusInfo.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {KIND_LABELS[lesson.kind]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {lessons.length > 10 && (
                <div className="flex justify-center p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        عرض أقل
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        عرض الكل ({lessons.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className={`${color} flex items-center gap-1.5 text-xs font-medium text-muted-foreground`}>
        {icon}
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
