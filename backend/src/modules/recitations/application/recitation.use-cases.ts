import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { UserRole } from '../../../shared/domain/user-role';
import { NotFoundError } from '../../../shared/domain/domain.error';
import { USER_REPOSITORY } from '../../users/domain/user.repository';
import type { UserRepository } from '../../users/domain/user.repository';
import { CLASS_REPOSITORY } from '../../classes/domain/class.repository';
import type { ClassRepository } from '../../classes/domain/class.repository';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { Recitation } from '../domain/recitation.entity';
import {
  RECITATION_REPOSITORY,
} from '../domain/recitation.repository';
import type { RecitationRepository } from '../domain/recitation.repository';
import { getSurah, SURAHS } from '../domain/quran';
import { buildHeart } from './heart';
import {
  AddRecitationDto,
  RecitationLogItem,
  StudentRecitationResult,
} from './dto/recitation.dto';

function toLogItem(
  r: Recitation,
  nameOf: (id: string) => string,
  withStudent = false,
): RecitationLogItem {
  return {
    id: r.id,
    studentId: r.studentId,
    studentName: withStudent ? nameOf(r.studentId) : undefined,
    surahNumber: r.surahNumber,
    surahName: getSurah(r.surahNumber)?.name ?? String(r.surahNumber),
    fromAyah: r.fromAyah,
    toAyah: r.toAyah,
    rating: r.rating,
    recitedByName: nameOf(r.recitedBy),
    createdAt: r.createdAt.toISOString(),
  };
}

/** Surah reference list for the searchable dropdown + heart labels. */
@Injectable()
export class ListSurahsUseCase {
  execute() {
    return SURAHS;
  }
}

/** Log a recitation for a student (institute staff). */
@Injectable()
export class AddRecitationUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(RECITATION_REPOSITORY)
    private readonly recitations: RecitationRepository,
  ) {}

  async execute(
    actor: Actor,
    studentId: string,
    dto: AddRecitationDto,
  ): Promise<void> {
    const student = await this.users.findById(studentId);
    if (
      !student ||
      student.role !== UserRole.Student ||
      !student.instituteId
    ) {
      throw new NotFoundError('Student not found');
    }
    await this.policy.assertStaffOf(actor, student.instituteId);

    const recitation = Recitation.create({
      instituteId: student.instituteId,
      studentId,
      surahNumber: dto.surahNumber,
      fromAyah: dto.fromAyah,
      toAyah: dto.toAyah,
      rating: dto.rating,
      recitedBy: actor.userId,
    });
    await this.recitations.save(recitation);
  }
}

/** Student recitation tab payload: summary + heart + log. Staff or student themselves. */
@Injectable()
export class GetStudentRecitationUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(RECITATION_REPOSITORY)
    private readonly recitations: RecitationRepository,
  ) {}

  async execute(
    actor: Actor,
    studentId: string,
  ): Promise<StudentRecitationResult> {
    const student = await this.users.findById(studentId);
    if (!student || student.role !== UserRole.Student || !student.instituteId) {
      throw new NotFoundError('Student not found');
    }
    const isSelf = actor.role === UserRole.Student && actor.userId === studentId;
    if (!isSelf) {
      await this.policy.assertStaffOf(actor, student.instituteId);
    }

    const recs = await this.recitations.findByStudent(studentId); // newest-first
    const authorIds = [...new Set(recs.map((r) => r.recitedBy))];
    const authors = await this.users.findManyByIds(authorIds);
    const nameMap = new Map(authors.map((u) => [u.id, u.fullName]));
    const nameOf = (id: string) => nameMap.get(id) ?? '—';

    const heart = buildHeart(recs);
    const log = recs.map((r) => toLogItem(r, nameOf));
    return {
      summary: {
        lastRecitation: log[0] ?? null,
        fullCount: heart.filter((c) => c.status === 'full').length,
        partialCount: heart.filter((c) => c.status === 'partial').length,
        totalRecitations: recs.length,
      },
      heart,
      log,
    };
  }
}

/** Recitation log for every student in a class (institute staff). */
@Injectable()
export class GetClassRecitationUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    @Inject(RECITATION_REPOSITORY)
    private readonly recitations: RecitationRepository,
  ) {}

  async execute(
    actor: Actor,
    classId: string,
  ): Promise<{ log: RecitationLogItem[]; students: { id: string; name: string }[] }> {
    const klass = await this.classes.findById(classId);
    if (!klass) throw new NotFoundError('Class not found');
    await this.policy.assertStaffOf(actor, klass.instituteId);

    const membership = await this.classes.getMembership(classId);
    const studentIds = membership.studentIds;
    const recs = await this.recitations.findByStudents(studentIds);

    const ids = [
      ...new Set([...studentIds, ...recs.map((r) => r.recitedBy)]),
    ];
    const people = await this.users.findManyByIds(ids);
    const nameMap = new Map(people.map((u) => [u.id, u.fullName]));
    const nameOf = (id: string) => nameMap.get(id) ?? '—';

    return {
      log: recs.map((r) => toLogItem(r, nameOf, true)),
      students: studentIds.map((id) => ({ id, name: nameOf(id) })),
    };
  }
}
