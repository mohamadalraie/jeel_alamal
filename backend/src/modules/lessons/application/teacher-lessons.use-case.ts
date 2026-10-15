import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import { LessonKind } from '../domain/lesson-kind';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { TeacherProgramEntry } from './dto/lesson.dto';
import { toEntryView } from './class-program.use-case';

const todayISO = () => new Date().toISOString().slice(0, 10);
const dayMapping = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * The lessons assigned to the acting teacher (spec 008, 009 & 012):
 * Merges concrete materialized lessons with unmaterialized upcoming weekly slots,
 * with the next upcoming session flagged for Quick Access highlight.
 * Scoped strictly to the requested or current institute to prevent leakage across institutes.
 */
@Injectable()
export class GetMyLessonsUseCase {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly policy: InstituteAccessPolicy,
  ) {}

  async execute(
    actor: Actor,
    requestedInstituteId?: string,
  ): Promise<{ entries: TeacherProgramEntry[] }> {
    const targetInstituteId = requestedInstituteId || actor.instituteId;

    // Security check: teacher must belong to the institute; manager must manage it
    if (targetInstituteId && actor.role !== UserRole.SuperAdmin) {
      if (actor.role === UserRole.Teacher) {
        const isMember = await this.users.isInInstitute(
          actor.userId,
          targetInstituteId,
        );
        if (!isMember) {
          return { entries: [] };
        }
      } else if (actor.role === UserRole.InstituteManager) {
        try {
          await this.policy.assertManagerOf(actor, targetInstituteId);
        } catch {
          return { entries: [] };
        }
      }
    }

    const raw = await this.lessons.getTeacherProgram(
      actor.userId,
      targetInstituteId,
    ); // sorted date,sort
    const today = todayISO();

    const materializedEntries: TeacherProgramEntry[] = raw.map((e) => ({
      ...toEntryView(e, today),
      isNext: false,
    }));

    // Retrieve candidate classes to surface upcoming template slots (spec 012)
    const teacherClasses = await this.classes.findClassesByTeacher(actor.userId);
    const relevantTeacherClasses = targetInstituteId
      ? teacherClasses.filter((c) => c.instituteId === targetInstituteId)
      : teacherClasses;

    const candidateMap = new Map<string, (typeof teacherClasses)[0]>();
    for (const c of relevantTeacherClasses) {
      candidateMap.set(c.id, c);
    }

    const isManagerOrAdmin =
      actor.role === 'institute_manager' || actor.role === 'super_admin';

    if (targetInstituteId && isManagerOrAdmin) {
      const instituteClasses =
        await this.classes.findAllByInstitute(targetInstituteId);
      for (const ic of instituteClasses) {
        if (!candidateMap.has(ic.id)) {
          candidateMap.set(ic.id, ic);
        }
      }
    }

    const unmaterializedEntries: TeacherProgramEntry[] = [];
    const todayDate = new Date(`${today}T00:00:00Z`);

    for (const klass of candidateMap.values()) {
      if (targetInstituteId && klass.instituteId !== targetInstituteId) {
        continue;
      }
      const schedule = await this.classes.getSchedule(klass.id);
      const isTeacherOfThisClass = teacherClasses.some((c) => c.id === klass.id);

      const teacherSlots = schedule.filter((s) => {
        // Point 3: recitation slots do not need materialization by teachers
        if (s.kind === 'recitation') return false;
        if (s.teacherId === actor.userId) return true;
        if (!s.teacherId && isTeacherOfThisClass) return true;
        if (isManagerOrAdmin) return true;
        return false;
      });

      if (teacherSlots.length === 0) continue;

      for (let offset = 0; offset < 14; offset++) {
        const d = new Date(todayDate);
        d.setUTCDate(todayDate.getUTCDate() + offset);
        const dateStr = d.toISOString().split('T')[0];
        const jsDay = d.getUTCDay();
        const dayOfWeek = dayMapping[jsDay];

        const matchingSlots = teacherSlots.filter((s) => s.dayOfWeek === dayOfWeek);

        for (const slot of matchingSlots) {
          const exists = materializedEntries.some(
            (e) =>
              e.classId === klass.id &&
              e.date === dateStr &&
              (slot.subjectId
                ? e.subjectId === slot.subjectId
                : e.kind === slot.kind && (e.sort ?? 0) === (slot.sort ?? 0)),
          );

          if (!exists) {
            unmaterializedEntries.push({
              lessonClassId: `slot_${slot.id}_${dateStr}`,
              lessonId: `temp_lesson_${slot.id}_${dateStr}`,
              scheduleSlotId: slot.id,
              isMaterialized: false,
              kind:
                slot.kind === 'recitation'
                  ? LessonKind.Recitation
                  : LessonKind.Lesson,
              name: slot.kind === 'recitation' ? 'جلسة تسميع' : null,
              subjectId: slot.subjectId ?? null,
              subjectName: null,
              description: null,
              category: null,
              date: dateStr,
              sort: slot.sort ?? 0,
              targetTrack: slot.trackType ?? 'regular',
              expectedDurationMinutes: slot.expectedDurationMinutes ?? null,
              status: 'pending',
              actualStartTime: null,
              actualEndTime: null,
              teacher: { id: actor.userId, name: '' },
              className: klass.name,
              classId: klass.id,
              startTime: { kind: slot.start.kind, value: slot.start.value },
              endTime: slot.end ? { kind: slot.end.kind, value: slot.end.value } : null,
              sources: [],
              isNext: false,
            });
          }
        }
      }
    }

    const all = [...materializedEntries, ...unmaterializedEntries].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aStart = a.startTime?.value ?? `${(a.sort ?? 0).toString().padStart(2, '0')}:00`;
      const bStart = b.startTime?.value ?? `${(b.sort ?? 0).toString().padStart(2, '0')}:00`;
      return aStart.localeCompare(bStart);
    });

    const upcomingDate = all.find((e) => e.date >= today)?.date;
    const entries = all.map((e) => ({
      ...e,
      isNext: upcomingDate ? e.date === upcomingDate : false,
    }));

    return { entries };
  }
}
