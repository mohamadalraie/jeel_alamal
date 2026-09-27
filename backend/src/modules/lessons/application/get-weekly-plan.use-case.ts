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
  subjectName?: string | null;
  teacherId: string | null;
  teacherName?: string | null;
  trackType: string;
  // If completed:
  lessonId?: string;
  lessonName?: string | null;
  // Time anchor details
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
      const dayMapping = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
      const dayOfWeek = dayMapping[jsDay];

      const dayLessons = actualLessons.filter(l => l.date === dateStr);
      const daySchedule = schedule.filter(s => s.dayOfWeek === dayOfWeek);

      const usedLessonIds = new Set<string>();

      // Pair scheduled slots with actual lessons given on this day
      for (const slot of daySchedule) {
        // Priority 1: Match by categoryId if set in schedule slot
        let matchedIndex = dayLessons.findIndex(l => 
          !usedLessonIds.has(l.lessonId) &&
          slot.categoryId &&
          l.category?.id === slot.categoryId
        );

        // Priority 2: If no category match, match any unused lesson for this track
        if (matchedIndex === -1) {
          matchedIndex = dayLessons.findIndex(l => 
            !usedLessonIds.has(l.lessonId) &&
            (l.targetTrack ?? 'regular') === (slot.trackType ?? 'regular')
          );
        }

        // Priority 3: Fallback to any unused lesson on this day
        if (matchedIndex === -1) {
          matchedIndex = dayLessons.findIndex(l => !usedLessonIds.has(l.lessonId));
        }

        if (matchedIndex !== -1) {
          const lesson = dayLessons[matchedIndex];
          usedLessonIds.add(lesson.lessonId);

          result.push({
            type: 'completed',
            date: dateStr,
            dayOfWeek,
            lessonId: lesson.lessonId,
            lessonName: lesson.name,
            subjectName: lesson.subjectName || slot.subjectName || null,
            categoryId: lesson.category?.id ?? slot.categoryId ?? null,
            teacherId: lesson.teacher.id,
            teacherName: lesson.teacher.name,
            trackType: slot.trackType ?? 'regular',
            startTime: { kind: slot.start.kind, value: slot.start.value },
            endTime: slot.end ? { kind: slot.end.kind, value: slot.end.value } : null,
          });
        } else if (dateStr >= todayStr) {
          // Unfulfilled pending slot
          result.push({
            type: 'pending',
            date: dateStr,
            dayOfWeek,
            subjectName: slot.subjectName ?? null,
            categoryId: slot.categoryId ?? null,
            teacherId: slot.teacherId ?? null,
            trackType: slot.trackType ?? 'regular',
            startTime: { kind: slot.start.kind, value: slot.start.value },
            endTime: slot.end ? { kind: slot.end.kind, value: slot.end.value } : null,
          });
        }
      }

      // Any remaining lessons given on this day that were NOT paired to a schedule slot (extra/unscheduled lessons)
      for (const lesson of dayLessons) {
        if (!usedLessonIds.has(lesson.lessonId)) {
          result.push({
            type: 'completed',
            date: dateStr,
            dayOfWeek,
            lessonId: lesson.lessonId,
            lessonName: lesson.name,
            subjectName: lesson.subjectName ?? null,
            categoryId: lesson.category?.id ?? null,
            teacherId: lesson.teacher.id,
            teacherName: lesson.teacher.name,
            trackType: lesson.targetTrack ?? 'regular',
          });
        }
      }
    }

    return result;
  }
}
