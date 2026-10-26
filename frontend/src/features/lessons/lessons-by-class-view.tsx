'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Share2,
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
  CalendarPlus,
} from 'lucide-react';
import type { ProgramEntry } from '@/lib/types';
import { formatTeacherName, formatDateLocale } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LessonStatusBadge } from './lesson-status-badge';
import { LessonDetailsDialog } from './lesson-details-dialog';
import { ShareClassSummaryDialog } from './share-class-summary-dialog';

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

  const [shareGroup, setShareGroup] = useState<ClassGroup | null>(null);

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
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 dark:border-slate-800 bg-card/80 dark:bg-slate-900/80 p-2.5 px-3.5 text-xs shadow-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <span className="flex items-center gap-1.5 font-semibold">
            <School className="size-4 text-primary" />
            <span>إجمالي الحلقات:</span>
            <Badge variant="secondary" className="font-bold text-xs px-2 py-0.5">
              {classGroups.length}
            </Badge>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {entries.length} درس
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="h-7.5 gap-1.5 text-xs font-semibold rounded-lg hover:border-primary/50"
          >
            <ChevronsDown className="size-3.5 text-primary" />
            <span>توسيع الكل</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="h-7.5 gap-1.5 text-xs font-semibold rounded-lg hover:border-primary/50"
          >
            <ChevronsUp className="size-3.5 text-muted-foreground" />
            <span>طي الكل</span>
          </Button>
        </div>
      </div>

      {/* Class Cards */}
      <div className="flex flex-col gap-3.5">
        {classGroups.map((group) => {
          const isExpanded = expandedKeys.has(group.classKey);

          return (
            <Card
              key={group.classKey}
              className="overflow-hidden rounded-2xl border border-border/80 dark:border-slate-800 bg-card dark:bg-slate-900/90 shadow-sm transition-all hover:shadow-md"
            >
              {/* Header / Click to toggle */}
              <div
                onClick={() => toggleExpand(group.classKey)}
                className="flex cursor-pointer flex-col gap-3 p-4 bg-card dark:bg-slate-900/95 hover:bg-muted/30 dark:hover:bg-slate-850/60 transition-colors sm:flex-row sm:items-center sm:justify-between"
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
                      <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium">
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
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 self-end sm:self-center">
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
                  <div className="flex w-20 sm:w-24 flex-col gap-1">
                    <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                      <span>الإنجاز</span>
                      <span>{group.completionRate}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-slate-800">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${group.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Share Summary Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareGroup(group);
                    }}
                    className="h-7 gap-1 px-2 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
                    title="مشاركة ملخص الحلقة"
                  >
                    <Share2 className="size-3 text-primary" />
                    <span className="hidden sm:inline">مشاركة</span>
                  </Button>

                  {/* Expand Chevron Button */}
                  <div className="flex size-7 items-center justify-center rounded-lg border border-border/80 dark:border-slate-750 bg-background dark:bg-slate-800 text-muted-foreground">
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
                <div className="border-t border-border/70 dark:border-slate-800 bg-muted/20 dark:bg-slate-950/60 p-3 sm:p-4">
                  <div className="flex items-center justify-between pb-3 text-xs text-muted-foreground font-medium">
                    <span>قائمة دروس حلقة {group.className} ({group.entries.length})</span>
                    {onAddLessonForClass && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onAddLessonForClass(group.classId, group.className)
                        }
                        className="h-7 gap-1 text-xs text-primary hover:bg-primary/10"
                      >
                        <Plus className="size-3.5" />
                        إضافة درس لهذه الحلقة
                      </Button>
                    )}
                  </div>

                  {/* High contrast lesson card stack */}
                  <div className="flex flex-col gap-2.5">
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

      <ShareClassSummaryDialog
        open={Boolean(shareGroup)}
        onOpenChange={(open) => {
          if (!open) setShareGroup(null);
        }}
        group={shareGroup}
      />
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

  const title = isRecitation
    ? t('recitation')
    : entry.name || entry.subjectName || entry.category?.name || t('scheduledSlot');

  return (
    <>
      <div
        onClick={() => setDetailsOpen(true)}
        className="group relative flex flex-col gap-2.5 rounded-xl border border-border/80 dark:border-slate-700/80 bg-card dark:bg-slate-800/95 hover:bg-muted/40 dark:hover:bg-slate-750 p-3.5 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 hover:shadow transition-all cursor-pointer"
      >
        {/* Top line: Date badge & Status badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-muted/80 dark:bg-slate-700/80 px-2.5 py-1 text-xs font-semibold text-foreground">
            <Calendar className="size-3 text-primary shrink-0" />
            <span>{dateFormatted}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {entry.isMaterialized === false && (
              <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-2 py-0.5">
                {t('unmaterializedBadge')}
              </span>
            )}
            <LessonStatusBadge status={entry.status} className="text-[10px]" />
          </div>
        </div>

        {/* Middle: Title & Meta info */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            {isRecitation ? (
              <BookMarked className="size-4 shrink-0 text-primary" />
            ) : entry.isMaterialized === false ? (
              <CalendarPlus className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
            ) : (
              <BookOpen className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            )}

            <span className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
              {title}
            </span>
          </div>

          {/* Teacher, Category, Duration row with ample space */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
            <span className="inline-flex items-center gap-1">
              <User className="size-3 text-muted-foreground/70" />
              <span>{formatTeacherName(entry.teacher.name)}</span>
            </span>

            {entry.category && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.category.color }}
                />
                <span style={{ color: entry.category.color }} className="font-medium">
                  {entry.category.name}
                </span>
              </span>
            )}

            {entry.expectedDurationMinutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground/70" />
                <span>{entry.expectedDurationMinutes} د</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom: Action buttons if any */}
        {renderActions && (
          <div
            className="flex items-center justify-end pt-2 border-t border-border/40 dark:border-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {renderActions(entry)}
          </div>
        )}
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
