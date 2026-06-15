import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../../shared/application/actor';
import { UserRole } from '../../../../shared/domain/user-role';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/domain.error';
import { CLASS_REPOSITORY } from '../../domain/class.repository';
import type { ClassRepository } from '../../domain/class.repository';
import { assertValidSlot } from '../../domain/class-schedule';
import type { AnchorKind, ScheduleSlot, Weekday } from '../../domain/class-schedule';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { UserRepository } from '../../../users/domain/user.repository';
import { InstituteAccessPolicy } from '../../../institutes/application/institute-access.policy';
import {
  ClassProfileResult,
  UpdateClassDto,
} from '../dto/class-profile.dto';

/** Full class aggregate for the profile page: details, schedule, members (named). */
@Injectable()
export class GetClassProfileUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(actor: Actor, classId: string): Promise<ClassProfileResult> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');

    if (actor.role === UserRole.Student) {
      // Students may only view the class they are enrolled in.
      const current = await this.classes.findCurrentClassOfStudent(actor.userId);
      if (!current || current.id !== classId) {
        throw new ForbiddenError('You are not enrolled in this class');
      }
    } else {
      await this.policy.assertStaffOf(actor, klass.instituteId);
    }

    const [membership, schedule] = await Promise.all([
      this.classes.getMembership(classId),
      this.classes.getSchedule(classId),
    ]);
    const ids = [...membership.teacherIds, ...membership.studentIds];
    const people = await this.users.findManyByIds(ids);
    const byId = new Map(people.map((u) => [u.id, u]));

    return {
      class: {
        id: klass.id,
        name: klass.name,
        description: klass.description,
        createdAt: klass.createdAt.toISOString(),
      },
      schedule: schedule.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        start: { kind: s.start.kind, value: s.start.value },
        end: s.end ? { kind: s.end.kind, value: s.end.value } : null,
      })),
      teachers: membership.teacherIds.map((id) => ({
        id,
        name: byId.get(id)?.fullName ?? '—',
        isSupervisor: membership.supervisorId === id,
      })),
      students: membership.studentIds.map((id) => ({
        id,
        name: byId.get(id)?.fullName ?? '—',
        schoolGrade: byId.get(id)?.schoolGrade ?? null,
      })),
    };
  }
}

/** Edit class name/description (manager/super_admin). */
@Injectable()
export class UpdateClassUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(actor: Actor, classId: string, dto: UpdateClassDto): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertManagerOf(actor, klass.instituteId);
    klass.edit({ name: dto.name, description: dto.description });
    await this.classes.save(klass);
  }
}

/** Delete a class (manager/super_admin). Cascades remove memberships + schedule. */
@Injectable()
export class DeleteClassUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(actor: Actor, classId: string): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertManagerOf(actor, klass.instituteId);
    await this.classes.delete(classId);
  }
}

/** Replace the weekly schedule (manager/super_admin). */
@Injectable()
export class SetClassScheduleUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
    slots: {
      dayOfWeek: string;
      start: { kind: string; value: string };
      end?: { kind: string; value: string } | null;
    }[],
  ): Promise<void> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertManagerOf(actor, klass.instituteId);

    const typed: ScheduleSlot[] = slots.map((s) => ({
      dayOfWeek: s.dayOfWeek as Weekday,
      start: { kind: s.start.kind as AnchorKind, value: s.start.value },
      end: s.end ? { kind: s.end.kind as AnchorKind, value: s.end.value } : null,
    }));
    typed.forEach(assertValidSlot);
    await this.classes.setSchedule(classId, typed);
  }
}
