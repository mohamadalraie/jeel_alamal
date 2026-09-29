'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronLeft, Plus, Calendar, Clock, BookOpen, CheckCircle2, User as UserIcon, BookMarked, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeeklyPlan, listLessonCategories } from '@/lib/api';
import type { WeeklyPlanSlot, LessonCategory, Weekday, ProgramEntry } from '@/lib/types';
import { AddLessonDialog, type LessonEditing } from '@/features/lessons/add-lesson-dialog';
import { LessonDetailsDialog } from '@/features/lessons/lesson-details-dialog';
import { Edit2 } from 'lucide-react';

// Compute the start of the week (Saturday) for a given date
function getStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, 6 = Saturday
  const diff = date.getDate() - day - (day === 6 ? 0 : 1); // Adjust when day is sunday
  // Wait, in JS 0 is Sunday, 6 is Saturday.
  // If we want Saturday to be the start of the week:
  // if day is 6 (Sat), diff = 0.
  // if day is 0 (Sun), diff = 1 day before -> Wait, Sat is before Sun.
  const diffToSat = (day + 1) % 7; 
  date.setDate(date.getDate() - diffToSat);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function InstituteWeeklyPlan({
  
  instituteId,
  canManage,
  teachers,
}: {
  
  instituteId: string;
  canManage: boolean;
  teachers: { id: string; name: string }[];
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tw = useTranslations('weekdays');

  const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [slots, setSlots] = useState<WeeklyPlanSlot[]>([]);
  const [categories, setCategories] = useState<LessonCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewLesson, setViewLesson] = useState<ProgramEntry | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonEditing | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    subjectId?: string | null;
    subjectName?: string | null;
    categoryId?: string | null;
    teacherId?: string | null;
    expectedDurationMinutes?: number | null;
    kind?: 'lesson' | 'recitation';
    classId?: string;
    className?: string;
  } | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const dateStr = weekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/institutes/${instituteId}/weekly-plan?weekStart=${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch plan');
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listLessonCategories(instituteId).then(setCategories).catch(console.error);
  }, [instituteId]);

  useEffect(() => {
    fetchPlan();
  }, [weekStart, classId]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const handlePlanLesson = async (slot: WeeklyPlanSlot) => {
    if (slot.kind === 'recitation' && slot.teacherId) {
      try {
        setLoading(true);
        await createLesson(instituteId, {
          kind: 'recitation',
          date: slot.date,
          expectedDurationMinutes: slot.expectedDurationMinutes ?? undefined,
          assignments: [{ classId: slot.classId || "", teacherId: slot.teacherId }],
        });
        await fetchPlan();
      } catch (err) {
        notify.error(err, tc('error'));
        setLoading(false);
      }
      return;
    }

    setSelectedSlot({
      date: slot.date,
      subjectId: slot.subjectId,
      subjectName: slot.subjectName,
      categoryId: slot.categoryId,
      teacherId: slot.teacherId,
      expectedDurationMinutes: slot.expectedDurationMinutes,
      kind: slot.kind,
      classId: slot.classId ?? undefined,
      className: slot.className ?? undefined,
    });
    setEditingLesson(null);
    setAddDialogOpen(true);
  };

  const handleEditLesson = (lesson: ProgramEntry) => {
    setViewLesson(null);
    setSelectedSlot(null);
    setEditingLesson({
      lessonId: lesson.lessonId,
      kind: lesson.kind,
      name: lesson.name,
      subjectId: lesson.subjectId ?? null,
      subjectName: lesson.subjectName ?? null,
      description: lesson.description,
      categoryId: lesson.category?.id ?? null,
      date: lesson.date,
      expectedDurationMinutes: lesson.expectedDurationMinutes,
      sources: lesson.sources.map((s) => ({ kind: s.kind, url: s.url, description: s.description ?? '' })),
    });
    setAddDialogOpen(true);
  };

  const handleAddExceptional = (dateStr: string) => {
    setSelectedSlot({
      date: dateStr,
    });
    setEditingLesson(null);
    setAddDialogOpen(true);
  };

  const tp = useTranslations('prayers');
  const formatAnchor = (a: { kind: string; value: string }) => {
    return a.kind === 'prayer' ? tp(a.value) : a.value;
  };

  const DAYS: Weekday[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls */}
      <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          <ChevronRight className="h-4 w-4 rtl:hidden" />
          <ChevronLeft className="h-4 w-4 ltr:hidden" />
          {t('prevWeek')}
        </Button>
        <div className="flex items-center gap-2 font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          <span dir="ltr">{weekStart.toLocaleDateString('en-CA')}</span>
        </div>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          {t('nextWeek')}
          <ChevronLeft className="h-4 w-4 rtl:hidden" />
          <ChevronRight className="h-4 w-4 ltr:hidden" />
        </Button>
      </div>

      {loading ? (
        <div className="text-center p-10 text-muted-foreground">{tc('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAYS.map((day, idx) => {
            // Calculate date for this day
            const d = new Date(weekStart);
            d.setDate(d.getDate() + idx);
            const dateStr = d.toLocaleDateString('en-CA');
            
            const daySlots = slots.filter((s) => s.date === dateStr);

            return (
              <div key={day} className="flex flex-col gap-2">
                <div className="bg-muted text-center py-2 px-1 rounded-md font-semibold text-sm border flex flex-col items-center justify-between gap-1">
                  <div className="flex items-center justify-between w-full px-1">
                    <span>{tw(day)}</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleAddExceptional(dateStr)}
                        title="إضافة درس استثنائي خارج الجدول"
                        className="text-primary hover:bg-primary/10 p-1 rounded transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal" dir="ltr">{dateStr}</div>
                </div>
                
                <div className="flex flex-col gap-2 min-h-[100px]">
                  {daySlots.length === 0 && (
                    <div className="text-xs text-center text-muted-foreground mt-4 opacity-50">
                      لا يوجد دروس
                    </div>
                  )}
                  {daySlots.map((slot, i) => {
                    const categoryObj = categories.find((c) => c.id === slot.categoryId);
                    const catName = categoryObj?.name || (slot.categoryId ? t('category') : null);
                    const teacherName = slot.teacherName || teachers.find((t) => t.id === slot.teacherId)?.name || t('noTeacher');

                    if (slot.type === 'completed') {
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => slot.fullLesson && setViewLesson(slot.fullLesson)}
                          className="relative bg-primary/5 border border-primary/20 rounded-md p-2.5 flex flex-col gap-1.5 hover:bg-primary/10 transition-colors text-start focus:outline-none focus:ring-2 focus:ring-primary/40"
                        >
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm">
                            {i + 1}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            {slot.startTime ? (
                              <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                <Clock className="h-3 w-3" />
                                <span>{formatAnchor(slot.startTime)}</span>
                                {slot.endTime && (
                                  <>
                                    <span>-</span>
                                    <span>{formatAnchor(slot.endTime)}</span>
                                  </>
                                )}
                              </div>
                            ) : <span />}
                            {slot.isExceptional && (
                              <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1 rounded text-[10px]">
                                استثنائي
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs font-bold text-primary">
                            {slot.kind === 'recitation' && <BookMarked className="h-3.5 w-3.5 shrink-0" />}
                            <span className="line-clamp-1">{slot.kind === 'recitation' ? 'جلسة تسميع' : (slot.lessonName || tc('lesson'))}</span>
                          </div>
                          
                          {slot.subjectName && (
                            <div className="text-xs font-medium text-foreground/90 truncate">
                              <span className="text-muted-foreground font-normal">المادة: </span>
                              {slot.subjectName}
                            </div>
                          )}

                          {catName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {categoryObj?.color && (
                                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: categoryObj.color }} />
                              )}
                              <span className="truncate">{catName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            <span className="truncate">{teacherName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-1">
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">{slot.className ?? 'بدون حلقة'}</span>
                          </div>
                        </button>
                      );
                    }

                    // Pending slot
                    return (
                      <div key={i} className="relative border-2 border-dashed border-muted-foreground/30 bg-muted/10 rounded-md p-2 flex flex-col gap-1.5 hover:border-primary/50 transition-colors group">
                        <div className="absolute -top-2 -right-2 bg-muted-foreground/20 text-muted-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary">
                            <Clock className="h-3.5 w-3.5" />
                            {slot.startTime ? (
                              <>
                                <span>{formatAnchor(slot.startTime)}</span>
                                {slot.endTime && (
                                  <>
                                    <span>-</span>
                                    <span>{formatAnchor(slot.endTime)}</span>
                                  </>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>

                        {slot.kind === 'recitation' ? (
                          <div className="text-xs font-semibold text-primary truncate mt-0.5 flex items-center gap-1">
                            <BookMarked className="h-3.5 w-3.5" />
                            جلسة تسميع
                          </div>
                        ) : slot.subjectName ? (
                          <div className="text-xs font-medium text-foreground/90 truncate mt-0.5">
                            <span className="text-muted-foreground font-normal">المادة: </span>
                            {slot.subjectName}
                          </div>
                        ) : null}
                        
                        {catName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {categoryObj?.color && (
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: categoryObj.color }} />
                            )}
                            <span className="truncate">{catName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserIcon className="h-3 w-3" />
                          <span className="truncate">{teacherName}</span>
                        </div>

                        {canManage && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 mt-1 w-full text-[10px] opacity-90 group-hover:opacity-100 transition-opacity"
                            onClick={() => handlePlanLesson(slot)}
                          >
                            {slot.kind === 'recitation' ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Plus className="h-3 w-3 mr-1" />
                            )}
                            {slot.kind === 'recitation' ? 'تثبيت الجلسة' : t('planLesson')}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddLessonDialog
        instituteId={instituteId}
        categories={categories}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onDone={fetchPlan}
        preselectClassId={selectedSlot?.classId}
        preselectDate={selectedSlot?.date}
        preselectSubjectId={selectedSlot?.subjectId ?? undefined}
        preselectSubjectName={selectedSlot?.subjectName ?? undefined}
        preselectCategoryId={selectedSlot?.categoryId ?? undefined}
        preselectTeacherId={selectedSlot?.teacherId ?? undefined}
        preselectDuration={selectedSlot?.expectedDurationMinutes ?? undefined}
        preselectKind={selectedSlot?.kind ?? undefined}
        editing={editingLesson}
      />

      <LessonDetailsDialog
        entry={viewLesson}
        open={!!viewLesson}
        onOpenChange={(op) => !op && setViewLesson(null)}
        actions={
          canManage ? (
            <Button variant="outline" size="sm" onClick={() => viewLesson && handleEditLesson(viewLesson)}>
              <Edit2 className="size-4 ml-2" />
              تعديل معلومات الدرس
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
