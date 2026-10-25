'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  GraduationCap,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { Card } from '@/components/ui/card';

export interface SummaryCardsProps {
  entries: ProgramEntry[];
  activeStatusFilter?: string | null;
  onSelectStatus?: (status: string | null) => void;
}

export function LessonsSummaryCards({
  entries,
  activeStatusFilter,
  onSelectStatus,
}: SummaryCardsProps) {
  const t = useTranslations('lessons');

  const stats = useMemo(() => {
    const total = entries.length;
    let completed = 0;
    let started = 0;
    let pending = 0;
    let notGiven = 0;

    const uniqueClasses = new Set<string>();
    const uniqueTeachers = new Set<string>();

    for (const e of entries) {
      if (e.className) uniqueClasses.add(e.className);
      if (e.teacher?.name) uniqueTeachers.add(e.teacher.name);

      if (e.status === 'finished' || e.status === 'over_time' || e.status === 'under_time') {
        completed++;
      } else if (e.status === 'started') {
        started++;
      } else if (e.status === 'not_given') {
        notGiven++;
      } else {
        pending++;
      }
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      started,
      pending,
      notGiven,
      completionRate,
      classCount: uniqueClasses.size,
      teacherCount: uniqueTeachers.size,
    };
  }, [entries]);

  const cards = [
    {
      id: 'all',
      title: 'إجمالي الدروس',
      count: stats.total,
      subtext: `${stats.classCount} حلقة · ${stats.teacherCount} معلّم`,
      icon: BookOpen,
      color: 'text-primary',
      bgLight: 'bg-primary/5',
      borderColor: 'border-primary/20',
      activeBorder: 'ring-2 ring-primary shadow-sm',
      statusKey: null,
    },
    {
      id: 'completed',
      title: 'الدروس المكتملة',
      count: stats.completed,
      subtext: `نسبة الإنجاز ${stats.completionRate}%`,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgLight: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'ring-2 ring-emerald-500 shadow-sm',
      statusKey: 'completed',
    },
    {
      id: 'started',
      title: 'قيد التنفيذ الآن',
      count: stats.started,
      subtext: stats.started > 0 ? 'دروس جارية حالياً' : 'لا توجد دروس جارية',
      icon: PlayCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bgLight: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      activeBorder: 'ring-2 ring-blue-500 shadow-sm',
      pulse: stats.started > 0,
      statusKey: 'started',
    },
    {
      id: 'pending',
      title: 'في الانتظار',
      count: stats.pending,
      subtext: 'مجدولة ولم تبدأ بعد',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgLight: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeBorder: 'ring-2 ring-amber-500 shadow-sm',
      statusKey: 'pending',
    },
    {
      id: 'not_given',
      title: 'لم تُعطَ / ملغاة',
      count: stats.notGiven,
      subtext: 'دروس فائتة أو معتذر عنها',
      icon: XCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bgLight: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      activeBorder: 'ring-2 ring-rose-500 shadow-sm',
      statusKey: 'not_given',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = activeStatusFilter === c.statusKey;

        return (
          <Card
            key={c.id}
            onClick={() => onSelectStatus?.(isSelected ? null : c.statusKey)}
            className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
              c.borderColor
            } ${isSelected ? c.activeBorder : 'hover:border-foreground/20'}`}
          >
            {/* Top row: Icon + Count */}
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${c.bgLight} ${c.color} transition-transform group-hover:scale-105`}
              >
                <Icon className="size-5" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight">{c.count}</span>
                {c.pulse && (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
                  </span>
                )}
              </div>
            </div>

            {/* Bottom info */}
            <div className="mt-3 flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground/90">{c.title}</span>
              <span className="text-[11px] text-muted-foreground truncate">{c.subtext}</span>
            </div>

            {/* Progress bar on completed card */}
            {c.id === 'completed' && stats.total > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
