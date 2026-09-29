import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { ForbiddenError, NotFoundError } from '../../../shared/domain/domain.error';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { LESSON_REPOSITORY, type LessonRepository } from '../domain/lesson.repository';
import { USER_REPOSITORY, type UserRepository } from '../../users/domain/user.repository';
import { UserRole } from '../../../shared/domain/user-role';

export interface WeeklyPlanSlot {
  type: 'completed' | 'pending';
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  /** ID of the class_schedule row this slot originates from (null for unscheduled lessons). */
  scheduleSlotId?: string | null;
  categoryId: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  teacherId: string | null;
  teacherName?: string | null;
  trackType: string;
  kind: 'lesson' | 'recitation';
  expectedDurationMinutes?: number | null;
  // If completed:
  lessonId?: string;
  lessonName?: string | null;
  fullLesson?: any;
  // Time anchor details
  startTime?: { kind: string; value: string };
  endTime?: { kind: string; value: string } | null;
  /** Whether this lesson was created outside the regular schedule (no matching slot). */
  isExceptional?: boolean;
  classId?: string | null;
  className?: string | null;
}

@Injectable()
export class GetWeeklyPlanUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
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
      const intensive = await this.classes.findCurrentIntensiveClassOfStudent(actor.userId);
      if (current?.id !== classId && intensive?.id !== classId) {
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
    
    // Fetch actual lessons, recurring schedule, institute subjects, and assigned teachers in parallel
    const [actualLessons, schedule, subjects] = await Promise.all([
      this.lessons.getClassProgram(classId, weekStartStr, weekEndStr),
      this.classes.getSchedule(classId),
      this.lessons.listSubjects(klass.instituteId, true),
    ]);

    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const teacherIds = Array.from(
      new Set(schedule.map((s) => s.teacherId).filter(Boolean) as string[]),
    );
    const teacherUsers = teacherIds.length
      ? await this.users.findManyByIds(teacherIds)
      : [];
    const teacherMap = new Map(teacherUsers.map((u) => [u.id, u.fullName]));

    const result: WeeklyPlanSlot[] = [];

    // Iterate through the 7 days of the requested week
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const jsDay = d.getUTCDay(); // 0 = Sunday, 1 = Monday... 6 = Saturday
      const dayMapping = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
      const dayOfWeek = dayMapping[jsDay];

      const dayLessons = actualLessons.filter((l) => l.date === dateStr);
      // Sort schedule slots by their sort order for this day
      const daySchedule = schedule
        .filter((s) => s.dayOfWeek === dayOfWeek)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

      const usedLessonIds = new Set<string>();
      const slotMatches = new Map<string, number>();

      // Pass 1: Strict match by subjectId
      for (const slot of daySchedule) {
        if (slot.subjectId) {
          const idx = dayLessons.findIndex((l) => !usedLessonIds.has(l.lessonId) && l.subjectId === slot.subjectId);
          if (idx !== -1) {
            slotMatches.set(slot.id, idx);
            usedLessonIds.add(dayLessons[idx].lessonId);
          }
        }
      }

      // Pass 2: Strict match by categoryId
      for (const slot of daySchedule) {
        if (!slotMatches.has(slot.id) && slot.categoryId) {
          const idx = dayLessons.findIndex((l) => !usedLessonIds.has(l.lessonId) && l.category?.id === slot.categoryId);
          if (idx !== -1) {
            slotMatches.set(slot.id, idx);
            usedLessonIds.add(dayLessons[idx].lessonId);
          }
        }
      }

      // Pass 3: Loose matches (trackType, kind, fallback)
      for (const slot of daySchedule) {
        if (!slotMatches.has(slot.id)) {
          let idx = dayLessons.findIndex(
            (l) => !usedLessonIds.has(l.lessonId) && (l.targetTrack ?? 'regular') === (slot.trackType ?? 'regular') && l.kind === (slot.kind ?? 'lesson')
          );
          if (idx === -1) {
            idx = dayLessons.findIndex(
              (l) => !usedLessonIds.has(l.lessonId) && (l.targetTrack ?? 'regular') === (slot.trackType ?? 'regular')
            );
          }
          if (idx === -1) {
            idx = dayLessons.findIndex((l) => !usedLessonIds.has(l.lessonId));
          }
          if (idx !== -1) {
            slotMatches.set(slot.id, idx);
            usedLessonIds.add(dayLessons[idx].lessonId);
          }
        }
      }

      // Render the slots
      for (const slot of daySchedule) {
        const matchedIndex = slotMatches.get(slot.id);

        const resolvedSubjectName = slot.subjectId
          ? (subjectMap.get(slot.subjectId) ?? null)
          : ((slot as any).subjectName ?? null);

        const resolvedTeacherName = slot.teacherId
          ? (teacherMap.get(slot.teacherId) ?? null)
          : null;

        if (matchedIndex !== undefined) {
          const lesson = dayLessons[matchedIndex];
          result.push({
            type: 'completed',
            date: dateStr,
            dayOfWeek,
            scheduleSlotId: slot.id,
            lessonId: lesson.lessonId,
            lessonName: lesson.name,
            subjectId: lesson.subjectId ?? slot.subjectId ?? null,
            subjectName: lesson.subjectName ?? resolvedSubjectName,
            categoryId: lesson.category?.id ?? slot.categoryId ?? null,
            teacherId: lesson.teacher.id,
            teacherName: lesson.teacher.name ?? resolvedTeacherName,
            trackType: slot.trackType ?? 'regular',
            kind: lesson.kind,
            expectedDurationMinutes:
              lesson.expectedDurationMinutes ?? slot.expectedDurationMinutes ?? null,
            startTime: { kind: slot.start.kind, value: slot.start.value },
            endTime: slot.end ? { kind: slot.end.kind, value: slot.end.value } : null,
            isExceptional: false,
            fullLesson: lesson,
          });
        } else {
          // Unfulfilled template slot for this week (pending confirmation/setup by manager)
          result.push({
            type: 'pending',
            date: dateStr,
            dayOfWeek,
            scheduleSlotId: slot.id,
            subjectId: slot.subjectId ?? null,
            subjectName: resolvedSubjectName,
            categoryId: slot.categoryId ?? null,
            teacherId: slot.teacherId ?? null,
            teacherName: resolvedTeacherName,
            trackType: slot.trackType ?? 'regular',
            kind: slot.kind ?? 'lesson',
            expectedDurationMinutes: slot.expectedDurationMinutes ?? null,
            startTime: { kind: slot.start.kind, value: slot.start.value },
            endTime: slot.end ? { kind: slot.end.kind, value: slot.end.value } : null,
          });
        }
      }

      // Any remaining lessons given on this day NOT paired to a schedule slot (exceptional)
      for (const lesson of dayLessons) {
        if (!usedLessonIds.has(lesson.lessonId)) {
          result.push({
            type: 'completed',
            date: dateStr,
            dayOfWeek,
            scheduleSlotId: null,
            lessonId: lesson.lessonId,
            lessonName: lesson.name,
            subjectId: lesson.subjectId ?? null,
            subjectName: lesson.subjectName ?? null,
            categoryId: lesson.category?.id ?? null,
            teacherId: lesson.teacher.id,
            teacherName: lesson.teacher.name,
            trackType: lesson.targetTrack ?? 'regular',
            kind: lesson.kind,
            expectedDurationMinutes: lesson.expectedDurationMinutes ?? null,
            isExceptional: true,
            fullLesson: lesson,
          });
        }
      }
    }

    return result;
  }

  async executeForInstitute(
    actor: Actor,
    instituteId: string,
    weekStart: string,
  ): Promise<WeeklyPlanSlot[]> {
    await this.policy.assertManagerOf(actor, instituteId);
    
    // Fetch all classes in the institute
    const classes = await this.classes.findClassesByInstitute(instituteId);
    
    // Get plan for each class
    const allSlots: WeeklyPlanSlot[] = [];
    
    // Process them in parallel for speed, though we could do sequential
    await Promise.all(
      classes.map(async (klass) => {
        try {
          const slots = await this.execute(actor, klass.id, weekStart);
          // Decorate with classId and className
          slots.forEach(slot => {
            slot.classId = klass.id;
            slot.className = klass.name;
          });
          allSlots.push(...slots);
        } catch (err) {
          // Ignore forbidden errors if any (though manager should have access)
          console.warn(`Could not fetch plan for class ${klass.id}:`, err);
        }
      })
    );
    
    return allSlots;
  }
}
