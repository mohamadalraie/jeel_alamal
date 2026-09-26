'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronLeft, Plus, Calendar, Clock, BookOpen, CheckCircle2, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWeeklyPlan, listLessonCategories } from '@/lib/api';
import type { WeeklyPlanSlot, LessonCategory, Weekday } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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

export function WeeklyPlanView({
  classId,
  instituteId,
  canManage,
  teachers,
}: {
  classId: string;
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

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const dateStr = weekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const data = await getWeeklyPlan(classId, dateStr);
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
                <div className="bg-muted text-center py-2 rounded-md font-semibold text-sm border">
                  <div>{tw(day)}</div>
                  <div className="text-xs text-muted-foreground font-normal" dir="ltr">{dateStr}</div>
                </div>
                
                <div className="flex flex-col gap-2 min-h-[100px]">
                  {daySlots.length === 0 && (
                    <div className="text-xs text-center text-muted-foreground mt-4 opacity-50">
                      -
                    </div>
                  )}
                  {daySlots.map((slot, i) => {
                    const catName = categories.find((c) => c.id === slot.categoryId)?.name || t('noCategory');
                    const teacherName = teachers.find((t) => t.id === slot.teacherId)?.name || t('noTeacher');

                    if (slot.type === 'completed') {
                      return (
                        <div key={i} className="bg-primary/5 border border-primary/20 rounded-md p-2 flex flex-col gap-1.5 hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="line-clamp-1">{slot.lessonName || tc('lesson')}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <BookOpen className="h-3 w-3" />
                            <span className="truncate">{catName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            <span className="truncate">{teacherName}</span>
                          </div>
                        </div>
                      );
                    }

                    // Pending slot
                    return (
                      <div key={i} className="border-2 border-dashed border-muted-foreground/30 bg-muted/10 rounded-md p-2 flex flex-col gap-1.5 hover:border-primary/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary">
                            <Clock className="h-3.5 w-3.5" />
                            <span dir="ltr">
                              {slot.startTime?.value} {slot.endTime ? `- ${slot.endTime.value}` : ''}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <BookOpen className="h-3 w-3" />
                          <span className="truncate">{catName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserIcon className="h-3 w-3" />
                          <span className="truncate">{teacherName}</span>
                        </div>

                        {canManage && (
                          <Button variant="secondary" size="sm" className="h-6 mt-1 w-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="h-3 w-3 mr-1" />
                            {t('planLesson')}
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
    </div>
  );
}
