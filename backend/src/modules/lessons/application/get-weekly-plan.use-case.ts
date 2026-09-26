import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { LESSON_REPOSITORY, type LessonRepository } from '../domain/lesson.repository';
import { WEEKDAYS } from '../../classes/domain/class-schedule';
import { UserRole } from '../../../shared/domain/user-role';

export interface WeeklyPlanSlot {
  type: 'completed' | 'pending';
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  categoryId: string | null;
  teacherId: string | null;
  trackType: string;
  // If completed:
  lessonId?: string;
  lessonName?: string | null;
  // If pending:
  startTime?: { kind: string; value: string };
  endTime?: { kind: string; value: string } | null;
}

@Injectable()
export class GetWeeklyPlanUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    weekStart: string,
  ): Promise<WeeklyPlanSlot[]> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');

    if (actor.role === UserRole.Student) {
      if (!klass.lessonsVisibleToStudents) {
        throw new ForbiddenError('Lessons are not visible to students');
      }
      const current = await this.classes.findCurrentClassOfStudent(actor.userId);
      if (!current || current.id !== classId) {
        throw new ForbiddenError('Not enrolled in this class');
      }
    } else {
      await this.policy.assertStaffOf(actor, klass.instituteId);
    }

    // Parse weekStart as UTC date at midnight to avoid timezone issues
    const startDate = new Date(`${weekStart}T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    
    const weekStartStr = weekStart;
    const weekEndStr = endDate.toISOString().split('T')[0];
    
    // We need to fetch the actual lessons for the given class and date range
    const actualLessons = await this.lessons.getClassProgram(classId, weekStartStr, weekEndStr);
    const schedule = await this.classes.getSchedule(classId);

    const todayStr = new Date().toISOString().split('T')[0];
    const result: WeeklyPlanSlot[] = [];

    // Iterate through the 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const jsDay = d.getUTCDay(); // 0 = Sunday, 1 = Monday... 6 = Saturday
      // Convert to our WEEKDAYS
      const dayMapping = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
      const dayOfWeek = dayMapping[jsDay];

      const dayLessons = actualLessons.filter(l => l.date === dateStr);
      
      // 1. Add all actual lessons for this day
      for (const lesson of dayLessons) {
        result.push({
          type: 'completed',
          date: dateStr,
          dayOfWeek,
          lessonId: lesson.lessonId,
          lessonName: lesson.name,
          categoryId: lesson.category?.id ?? null,
          teacherId: lesson.teacher.id, 
          trackType: lesson.targetTrack ?? 'regular', 
        });
      }

      // 2. Add pending slots if date >= today
      if (dateStr >= todayStr) {
        const daySchedule = schedule.filter(s => s.dayOfWeek === dayOfWeek);
        for (const slot of daySchedule) {
          const isFulfilled = dayLessons.some(l => 
            l.category?.id === slot.categoryId && 
            l.targetTrack === (slot.trackType ?? 'regular')
          );

          if (!isFulfilled) {
            result.push({
              type: 'pending',
              date: dateStr,
              dayOfWeek,
              categoryId: slot.categoryId ?? null,
              teacherId: slot.teacherId ?? null,
              trackType: slot.trackType ?? 'regular',
              startTime: { kind: slot.start.kind, value: slot.start.value },
              endTime: slot.end ? { kind: slot.end.kind, value: slot.end.value } : null,
            });
          }
        }
      }
    }

    return result;
  }
}
