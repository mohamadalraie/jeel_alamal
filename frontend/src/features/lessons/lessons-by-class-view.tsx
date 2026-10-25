'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChevronDown,
  ChevronUp,
  School,
  User,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  BookOpen,
  BookMarked,
  Plus,
  Calendar,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { formatTeacherName, formatDateLocale } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LessonStatusBadge } from './lesson-status-badge';
import { LessonDetailsDialog } from './lesson-details-dialog';

export interface ByClassViewProps {
  entries: ProgramEntry[];
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
  onAddLessonForClass?: (classId?: string, className?: string) => void;
}

interface ClassGroup {
  classKey: string;
  className: string;
  classId?: string;
  entries: ProgramEntry[];
  total: number;
  completed: number;
  started: number;
  pending: number;
  notGiven: number;
  completionRate: number;
  teachers: string[];
}

export function LessonsByClassView({
  entries,
  renderActions,
  onAddLessonForClass,
}: ByClassViewProps) {
  const t = useTranslations('lessons');
  const locale = useLocale();

  // Keep track of expanded classes (default to all expanded or first 3)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  // Group entries by class
  const classGroups = useMemo(() => {
    const map = new Map<string, ClassGroup>();

    for (const e of entries) {
      const key = e.classId || e.className || 'unassigned';
      if (!map.has(key)) {
        map.set(key, {
          classKey: key,
          className: e.className || 'حلقة غير محددة',
          classId: e.classId,
          entries: [],
          total: 0,
          completed: 0,
          started: 0,
          pending: 0,
          notGiven: 0,
          completionRate: 0,
          teachers: [],
        });
      }

      const g = map.get(key)!;
      g.entries.push(e);
      g.total++;

      if (e.teacher?.name && !g.teachers.includes(e.teacher.name)) {
        g.teachers.push(e.teacher.name);
      }

      if (
        e.status === 'finished' ||
        e.status === 'over_time' ||
        e.status === 'under_time'
      ) {
        g.completed++;
      } else if (e.status === 'started') {
        g.started++;
      } else if (e.status === 'not_given') {
        g.notGiven++;
      } else {
        g.pending++;
      }
    }

    // Sort entries within each class by date
    for (const g of map.values()) {
      g.entries.sort((a, b) => a.date.localeCompare(b.date) || a.sort - b.sort);
      g.completionRate =
        g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
    }

    return Array.from(map.values()).sort((a, b) =>
      a.className.localeCompare(b.className)
    );
  }, [entries]);

  // Expand all by default if not many
  useMemo(() => {
    if (classGroups.length > 0 && expandedKeys.size === 0) {
      // Default expand all
      setExpandedKeys(new Set(classGroups.map((g) => g.classKey)));
    }
  }, [classGroups]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedKeys(new Set(classGroups.map((g) => g.classKey)));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  if (classGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card/50 p-12 text-center text-muted-foreground shadow-sm">
        <School className="size-10 opacity-40" />
        <p className="text-sm font-medium">لا توجد دروس مطابقة للفلاتر المحددة</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>إجمالي الحلقات: {classGroups.length} حلقة</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="hover:text-primary transition-colors font-medium"
          >
            توسيع الكل
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="hover:text-primary transition-colors font-medium"
          >
            طي الكل
          </button>
        </div>
      </div>

      {/* Class Cards */}
      <div className="flex flex-col gap-3.5">
        {classGroups.map((group) => {
          const isExpanded = expandedKeys.has(group.classKey);

          return (
            <Card
              key={group.classKey}
              className="overflow-hidden rounded-2xl border transition-shadow hover:shadow-sm"
            >
              {/* Header / Click to toggle */}
              <div
                onClick={() => toggleExpand(group.classKey)}
                className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Class Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <School className="size-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base truncate">
                        {group.className}
                      </h3>
                      <Badge variant="outline" className="text-[10px] py-0 px-2">
                        {group.total} دروس
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <div className="flex items-center gap-1">
                        <User className="size-3 text-muted-foreground/70" />
                        <span>
                          {group.teachers.length > 0
                            ? group.teachers.map((t) => formatTeacherName(t)).join('، ')
                            : 'لا يوجد معلم'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Progress & Stats */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-end sm:self-center">
                  {/* Status counts mini pills */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="size-3.5" />
                      {group.completed}
                    </span>
                    {group.started > 0 && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                        <PlayCircle className="size-3.5" />
                        {group.started}
                      </span>
                    )}
                    {group.pending > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="size-3.5" />
                        {group.pending}
                      </span>
                    )}
                    {group.notGiven > 0 && (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                        <XCircle className="size-3.5" />
                        {group.notGiven}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="flex w-24 flex-col gap-1 sm:w-28">
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                      <span>الإنجاز</span>
                      <span>{group.completionRate}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${group.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Expand Chevron Button */}
                  <div className="flex size-7 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="border-t bg-muted/10 p-3 sm:p-4">
                  <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground">
                    <span>قائمة دروس حلقة {group.className}</span>
                    {onAddLessonForClass && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onAddLessonForClass(group.classId, group.className)
                        }
                        className="h-7 gap-1 text-xs text-primary"
                      >
                        <Plus className="size-3.5" />
                        إضافة درس لهذه الحلقة
                      </Button>
                    )}
                  </div>

                  <div className="divide-y divide-border/60 rounded-xl border bg-card overflow-hidden">
                    {group.entries.map((entry) => (
                      <ClassLessonRow
                        key={entry.lessonClassId}
                        entry={entry}
                        renderActions={renderActions}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ClassLessonRow({
  entry,
  renderActions,
}: {
  entry: ProgramEntry;
  renderActions?: (entry: ProgramEntry) => React.ReactNode;
}) {
  const t = useTranslations('lessons');
  const locale = useLocale();
  const dateLoc = formatDateLocale(locale);
  const isRecitation = entry.kind === 'recitation';
  const [detailsOpen, setDetailsOpen] = useState(false);

  const dateObj = new Date(entry.date + 'T12:00:00');
  const dateFormatted = dateObj.toLocaleDateString(dateLoc, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className="flex cursor-pointer items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/40"
      >
        {/* Date + Name */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Date pill */}
          <div className="flex min-w-[70px] flex-col items-center justify-center rounded-lg bg-muted/60 py-1 px-1.5 text-center text-xs">
            <span className="font-semibold text-foreground/90">{dateFormatted}</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              {isRecitation ? (
                <BookMarked className="size-4 shrink-0 text-primary" />
              ) : (
                <BookOpen className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="font-semibold text-xs sm:text-sm truncate hover:text-primary transition-colors">
                {isRecitation ? t('recitation') : entry.name}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span>{formatTeacherName(entry.teacher.name)}</span>
              {entry.category && (
                <>
                  <span>·</span>
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: entry.category.color }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: entry.category.color }}
                    />
                    {entry.category.name}
                  </span>
                </>
              )}
              {entry.expectedDurationMinutes && (
                <>
                  <span>·</span>
                  <span>{entry.expectedDurationMinutes} د</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <LessonStatusBadge status={entry.status} className="text-[10px]" />

          {renderActions && (
            <div onClick={(e) => e.stopPropagation()}>{renderActions(entry)}</div>
          )}
        </div>
      </div>

      <LessonDetailsDialog
        entry={entry}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        actions={renderActions?.(entry)}
      />
    </>
  );
}
