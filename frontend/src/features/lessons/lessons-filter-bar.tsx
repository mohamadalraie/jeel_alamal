'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar as CalendarIcon,
  Filter,
  Search,
  X,
  RotateCcw,
  BookOpen,
  User,
  School,
  Tag,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { LessonCategory, User as TeacherUser, ClassItem } from '@/lib/types';
import { formatTeacherName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'all' | 'custom';

export interface FilterState {
  preset: DatePreset;
  fromDate?: string;
  toDate?: string;
  classId?: string;
  teacherId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  needsAttentionOnly?: boolean;
}

export interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  classes: ClassItem[];
  teachers: TeacherUser[];
  categories: LessonCategory[];
  totalFilteredCount: number;
  totalAllCount: number;
  needsAttentionCount?: number;
}

export function LessonsFilterBar({
  filters,
  onChange,
  classes,
  teachers,
  categories,
  totalFilteredCount,
  totalAllCount,
  needsAttentionCount,
}: FilterBarProps) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const [showCustomDates, setShowCustomDates] = useState(filters.preset === 'custom');

  const update = (patch: Partial<FilterState>) => {
    onChange({ ...filters, ...patch });
  };

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustomDates(true);
      update({ preset: 'custom' });
      return;
    }
    setShowCustomDates(false);

    const now = new Date();
    if (preset === 'this_week') {
      // Arabic Saturday-first week
      const day = now.getDay();
      const diffToSat = (day + 1) % 7;
      const sat = new Date(now);
      sat.setDate(now.getDate() - diffToSat);
      const fri = new Date(sat);
      fri.setDate(sat.getDate() + 6);

      update({
        preset,
        fromDate: sat.toISOString().slice(0, 10),
        toDate: fri.toISOString().slice(0, 10),
      });
    } else if (preset === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      update({
        preset,
        fromDate: first.toISOString().slice(0, 10),
        toDate: last.toISOString().slice(0, 10),
      });
    } else if (preset === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      update({
        preset,
        fromDate: first.toISOString().slice(0, 10),
        toDate: last.toISOString().slice(0, 10),
      });
    } else if (preset === 'all') {
      update({
        preset,
        fromDate: undefined,
        toDate: undefined,
      });
    }
  };

  const hasActiveFilters = Boolean(
    (filters.preset !== 'this_month' && filters.preset !== 'all') ||
      filters.classId ||
      filters.teacherId ||
      filters.categoryId ||
      filters.status ||
      filters.search ||
      filters.fromDate ||
      filters.toDate ||
      filters.needsAttentionOnly
  );

  const clearAllFilters = () => {
    setShowCustomDates(false);
    onChange({
      preset: 'this_month',
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
      classId: undefined,
      teacherId: undefined,
      categoryId: undefined,
      status: undefined,
      search: undefined,
      needsAttentionOnly: undefined,
    });
  };

  const selectedClass = classes.find((c) => c.id === filters.classId);
  const selectedTeacher = teachers.find((t) => t.id === filters.teacherId);
  const selectedCategory = categories.find((c) => c.id === filters.categoryId);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-3.5 shadow-sm backdrop-blur sm:p-4">
      {/* Row 1: Search & Date Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={filters.search ?? ''}
            onChange={(e) => update({ search: e.target.value || undefined })}
            placeholder="بحث باسم الدرس، المعلم، أو الحلقة..."
            className="pr-9 pl-8 text-xs sm:text-sm h-9"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: undefined })}
              className="text-muted-foreground hover:text-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Date presets pill group + Needs Attention Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={filters.needsAttentionOnly ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => update({ needsAttentionOnly: !filters.needsAttentionOnly })}
            className={`h-7.5 rounded-lg px-2.5 text-xs font-semibold gap-1.5 transition-all ${
              filters.needsAttentionOnly
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs'
                : 'text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/15'
            }`}
          >
            <AlertTriangle className="size-3.5" />
            <span>{t('needsAttentionFilter')}</span>
            {typeof needsAttentionCount === 'number' && needsAttentionCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  filters.needsAttentionOnly
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                {needsAttentionCount}
              </span>
            )}
          </Button>

          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1">
            <Button
              type="button"
              variant={filters.preset === 'this_week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePresetChange('this_week')}
              className="h-7 rounded-lg px-2.5 text-xs font-medium"
            >
              هذا الأسبوع
            </Button>
          <Button
            type="button"
            variant={filters.preset === 'this_month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePresetChange('this_month')}
            className="h-7 rounded-lg px-2.5 text-xs font-medium"
          >
            هذا الشهر
          </Button>
          <Button
            type="button"
            variant={filters.preset === 'last_month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePresetChange('last_month')}
            className="h-7 rounded-lg px-2.5 text-xs font-medium"
          >
            الشهر الماضي
          </Button>
          <Button
            type="button"
            variant={filters.preset === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePresetChange('all')}
            className="h-7 rounded-lg px-2.5 text-xs font-medium"
          >
            الكل
          </Button>
          <Button
            type="button"
            variant={filters.preset === 'custom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePresetChange('custom')}
            className="h-7 rounded-lg px-2.5 text-xs font-medium"
          >
            <CalendarIcon className="size-3 ml-1" />
            مخصص
          </Button>
        </div>
      </div>
    </div>

      {/* Row 2: Custom Date Range (collapsible) */}
      {showCustomDates && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2.5 text-xs">
          <span className="text-muted-foreground font-medium">الفترة الزمنية:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">من</span>
            <Input
              type="date"
              value={filters.fromDate ?? ''}
              onChange={(e) => update({ fromDate: e.target.value || undefined })}
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">إلى</span>
            <Input
              type="date"
              value={filters.toDate ?? ''}
              onChange={(e) => update({ toDate: e.target.value || undefined })}
              className="h-8 w-36 text-xs"
            />
          </div>
        </div>
      )}

      {/* Row 3: Dimension Dropdown Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Class Filter */}
        <Select
          value={filters.classId ?? 'all'}
          onValueChange={(val) => update({ classId: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <School className="text-muted-foreground size-3.5 shrink-0" />
              <SelectValue placeholder="الحلقة" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">جميع الحلقات</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Teacher Filter */}
        <Select
          value={filters.teacherId ?? 'all'}
          onValueChange={(val) => update({ teacherId: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <User className="text-muted-foreground size-3.5 shrink-0" />
              <SelectValue placeholder="المعلّم" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">جميع الأساتذة</SelectItem>
            {teachers.map((teach) => (
              <SelectItem key={teach.id} value={teach.id}>
                {formatTeacherName(`${teach.firstName} ${teach.lastName}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.categoryId ?? 'all'}
          onValueChange={(val) => update({ categoryId: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <Tag className="text-muted-foreground size-3.5 shrink-0" />
              <SelectValue placeholder="التصنيف" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">جميع التصنيفات</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(val) => update({ status: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="text-muted-foreground size-3.5 shrink-0" />
              <SelectValue placeholder="الحالة" />
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="started">قيد التنفيذ (جارٍ)</SelectItem>
            <SelectItem value="pending">في الانتظار (مجدول)</SelectItem>
            <SelectItem value="not_given">لم يُعطَ / ملغى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 4: Active Filter Chips & Clear */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
              <Filter className="size-3" />
              الفلاتر النشطة:
            </span>

            {filters.search && (
              <Badge variant="secondary" className="gap-1 py-0.5 text-[11px]">
                بحث: &quot;{filters.search}&quot;
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={() => update({ search: undefined })}
                />
              </Badge>
            )}

            {selectedClass && (
              <Badge variant="secondary" className="gap-1 py-0.5 text-[11px]">
                الحلقة: {selectedClass.name}
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={() => update({ classId: undefined })}
                />
              </Badge>
            )}

            {selectedTeacher && (
              <Badge variant="secondary" className="gap-1 py-0.5 text-[11px]">
                المعلم: {formatTeacherName(`${selectedTeacher.firstName} ${selectedTeacher.lastName}`)}
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={() => update({ teacherId: undefined })}
                />
              </Badge>
            )}

            {selectedCategory && (
              <Badge variant="secondary" className="gap-1 py-0.5 text-[11px]">
                التصنيف: {selectedCategory.name}
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={() => update({ categoryId: undefined })}
                />
              </Badge>
            )}

            {filters.status && (
              <Badge variant="secondary" className="gap-1 py-0.5 text-[11px]">
                الحالة:{' '}
                {filters.status === 'completed'
                  ? 'مكتمل'
                  : filters.status === 'started'
                  ? 'قيد التنفيذ'
                  : filters.status === 'pending'
                  ? 'في الانتظار'
                  : 'لم يُعطَ'}
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={() => update({ status: undefined })}
                />
              </Badge>
            )}

            {filters.needsAttentionOnly && (
              <Badge
                variant="secondary"
                className="gap-1 py-0.5 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
              >
                <AlertTriangle className="size-3 text-amber-500" />
                {t('needsAttentionFilter')}
                <X
                  className="size-3 cursor-pointer hover:text-destructive"
                  onClick={() => update({ needsAttentionOnly: undefined })}
                />
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              عرض {totalFilteredCount} من أصل {totalAllCount} درس
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="size-3" />
              إعادة تعيين
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
