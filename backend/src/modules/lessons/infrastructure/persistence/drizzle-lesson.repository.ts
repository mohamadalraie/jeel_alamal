import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { LessonCategory } from '../../domain/lesson-category.entity';
import { Lesson } from '../../domain/lesson.entity';
import { LessonClassBinding } from '../../domain/lesson-class-binding.entity';
import { LessonKind } from '../../domain/lesson-kind';
import { LessonSourceKind } from '../../domain/lesson-source-kind';
import type {
  LessonRepository,
  ProgramEntryRead,
  SourceRead,
} from '../../domain/lesson.repository';
import {
  lessonCategories,
  lessonClasses,
  lessonSources,
  lessons,
  type LessonCategoryRow,
  type LessonRow,
  type LessonSourceRow,
} from './lesson.schema';
import { classes } from '../../../classes/infrastructure/persistence/class.schema';
import { users } from '../../../users/infrastructure/persistence/user.schema';

type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

const toCategory = (r: LessonCategoryRow): LessonCategory =>
  LessonCategory.reconstitute(r.id, {
    instituteId: r.instituteId,
    name: r.name,
    color: r.color,
    createdAt: r.createdAt,
  });

const toLesson = (r: LessonRow, sources: LessonSourceRow[]): Lesson =>
  Lesson.reconstitute(r.id, {
    instituteId: r.instituteId,
    kind: r.kind as LessonKind,
    name: r.name,
    description: r.description,
    categoryId: r.categoryId,
    date: r.date,
    sources: [...sources]
      .sort((a, b) => a.sort - b.sort)
      .map((s) => ({
        kind: s.kind as LessonSourceKind,
        url: s.url,
        description: s.description,
        sort: s.sort,
      })),
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  });

async function insertSources(tx: DrizzleTx, lesson: Lesson): Promise<void> {
  if (lesson.sources.length === 0) return;
  await tx.insert(lessonSources).values(
    lesson.sources.map((s, i) => ({
      id: randomUUID(),
      lessonId: lesson.id,
      kind: s.kind,
      url: s.url,
      description: s.description,
      sort: s.sort ?? i,
    })),
  );
}

/** Next order index for a class's entries on a given date. */
async function nextSortFor(tx: DrizzleTx, classId: string, date: string): Promise<number> {
  const rows = await tx
    .select({ s: lessonClasses.sort })
    .from(lessonClasses)
    .innerJoin(lessons, eq(lessonClasses.lessonId, lessons.id))
    .where(and(eq(lessonClasses.classId, classId), eq(lessons.date, date)));
  return rows.reduce((m, r) => Math.max(m, r.s), -1) + 1;
}

@Injectable()
export class DrizzleLessonRepository implements LessonRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  // ── Categories ──
  async addCategory(category: LessonCategory): Promise<void> {
    await this.db.insert(lessonCategories).values({
      id: category.id,
      instituteId: category.instituteId,
      name: category.name,
      color: category.color,
      createdAt: category.createdAt,
    });
  }

  async listCategories(instituteId: string): Promise<LessonCategory[]> {
    const rows = await this.db
      .select()
      .from(lessonCategories)
      .where(eq(lessonCategories.instituteId, instituteId))
      .orderBy(asc(lessonCategories.createdAt));
    return rows.map(toCategory);
  }

  async findCategoryById(id: string): Promise<LessonCategory | null> {
    const [row] = await this.db
      .select()
      .from(lessonCategories)
      .where(eq(lessonCategories.id, id))
      .limit(1);
    return row ? toCategory(row) : null;
  }

  async saveCategory(category: LessonCategory): Promise<void> {
    await this.db
      .update(lessonCategories)
      .set({ name: category.name, color: category.color })
      .where(eq(lessonCategories.id, category.id));
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.delete(lessonCategories).where(eq(lessonCategories.id, id));
  }

  // ── Lessons (writes) ──
  async createLesson(lesson: Lesson, bindings: LessonClassBinding[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(lessons).values({
        id: lesson.id,
        instituteId: lesson.instituteId,
        kind: lesson.kind,
        name: lesson.name,
        description: lesson.description,
        categoryId: lesson.categoryId,
        date: lesson.date,
        createdBy: lesson.createdBy,
        createdAt: lesson.createdAt,
      });
      await insertSources(tx, lesson);
      for (const b of bindings) {
        const sort = await nextSortFor(tx, b.classId, lesson.date);
        await tx.insert(lessonClasses).values({
          id: b.id,
          lessonId: b.lessonId,
          classId: b.classId,
          teacherId: b.teacherId,
          sort,
        });
      }
    });
  }

  async findLessonById(id: string): Promise<Lesson | null> {
    const [row] = await this.db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    if (!row) return null;
    const srcs = await this.db
      .select()
      .from(lessonSources)
      .where(eq(lessonSources.lessonId, id));
    return toLesson(row, srcs);
  }

  async updateLesson(lesson: Lesson): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(lessons)
        .set({
          name: lesson.name,
          description: lesson.description,
          categoryId: lesson.categoryId,
          date: lesson.date,
        })
        .where(eq(lessons.id, lesson.id));
      await tx.delete(lessonSources).where(eq(lessonSources.lessonId, lesson.id));
      await insertSources(tx, lesson);
    });
  }

  async setBindings(lessonId: string, bindings: LessonClassBinding[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ date: lessons.date })
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);
      const date = row?.date ?? '1970-01-01';
      await tx.delete(lessonClasses).where(eq(lessonClasses.lessonId, lessonId));
      for (const b of bindings) {
        const sort = await nextSortFor(tx, b.classId, date);
        await tx.insert(lessonClasses).values({
          id: b.id,
          lessonId,
          classId: b.classId,
          teacherId: b.teacherId,
          sort,
        });
      }
    });
  }

  async deleteLesson(id: string): Promise<void> {
    await this.db.delete(lessons).where(eq(lessons.id, id));
  }

  async removeBinding(lessonClassId: string): Promise<void> {
    await this.db.delete(lessonClasses).where(eq(lessonClasses.id, lessonClassId));
  }

  async findBindingById(lessonClassId: string): Promise<LessonClassBinding | null> {
    const [row] = await this.db
      .select()
      .from(lessonClasses)
      .where(eq(lessonClasses.id, lessonClassId))
      .limit(1);
    return row
      ? LessonClassBinding.reconstitute(row.id, {
          lessonId: row.lessonId,
          classId: row.classId,
          teacherId: row.teacherId,
          sort: row.sort,
        })
      : null;
  }

  async reorderClassDay(
    classId: string,
    _date: string,
    orderedLessonClassIds: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < orderedLessonClassIds.length; i++) {
        await tx
          .update(lessonClasses)
          .set({ sort: i })
          .where(
            and(
              eq(lessonClasses.id, orderedLessonClassIds[i]),
              eq(lessonClasses.classId, classId),
            ),
          );
      }
    });
  }

  // ── Reads ──
  async getClassProgram(classId: string, from?: string, to?: string): Promise<ProgramEntryRead[]> {
    const conds: SQL[] = [eq(lessonClasses.classId, classId)];
    if (from) conds.push(gte(lessons.date, from));
    if (to) conds.push(lte(lessons.date, to));
    return this.queryEntries(and(...conds)!);
  }

  async getClassProgramUpTo(classId: string, today: string): Promise<ProgramEntryRead[]> {
    return this.queryEntries(
      and(eq(lessonClasses.classId, classId), lte(lessons.date, today))!,
    );
  }

  async getInstituteProgram(instituteId: string, from?: string, to?: string): Promise<ProgramEntryRead[]> {
    const conds: SQL[] = [eq(lessons.instituteId, instituteId)];
    if (from) conds.push(gte(lessons.date, from));
    if (to) conds.push(lte(lessons.date, to));
    return this.queryEntries(and(...conds)!);
  }

  async getTeacherProgram(teacherId: string): Promise<ProgramEntryRead[]> {
    return this.queryEntries(eq(lessonClasses.teacherId, teacherId));
  }

  /** Shared join + source assembly for the program read models. */
  private async queryEntries(where: SQL): Promise<ProgramEntryRead[]> {
    const rows = await this.db
      .select({
        lessonClassId: lessonClasses.id,
        lessonId: lessons.id,
        kind: lessons.kind,
        name: lessons.name,
        description: lessons.description,
        date: lessons.date,
        sort: lessonClasses.sort,
        teacherId: users.id,
        teacherFirst: users.firstName,
        teacherLast: users.lastName,
        classId: lessonClasses.classId,
        className: classes.name,
        categoryId: lessonCategories.id,
        categoryName: lessonCategories.name,
        categoryColor: lessonCategories.color,
      })
      .from(lessonClasses)
      .innerJoin(lessons, eq(lessonClasses.lessonId, lessons.id))
      .innerJoin(classes, eq(lessonClasses.classId, classes.id))
      .innerJoin(users, eq(lessonClasses.teacherId, users.id))
      .leftJoin(lessonCategories, eq(lessons.categoryId, lessonCategories.id))
      .where(where)
      .orderBy(asc(lessons.date), asc(lessonClasses.sort));

    const lessonIds = [...new Set(rows.map((r) => r.lessonId))];
    const srcRows = lessonIds.length
      ? await this.db
          .select()
          .from(lessonSources)
          .where(inArray(lessonSources.lessonId, lessonIds))
          .orderBy(asc(lessonSources.sort))
      : [];
    const sourcesByLesson = new Map<string, SourceRead[]>();
    for (const s of srcRows) {
      const list = sourcesByLesson.get(s.lessonId) ?? [];
      list.push({ kind: s.kind as LessonSourceKind, url: s.url, description: s.description });
      sourcesByLesson.set(s.lessonId, list);
    }

    return rows.map((r) => ({
      lessonClassId: r.lessonClassId,
      lessonId: r.lessonId,
      kind: r.kind as LessonKind,
      name: r.name,
      description: r.description,
      category: r.categoryId
        ? { id: r.categoryId, name: r.categoryName!, color: r.categoryColor! }
        : null,
      date: r.date,
      sort: r.sort,
      teacher: { id: r.teacherId, name: `${r.teacherFirst} ${r.teacherLast}` },
      classId: r.classId,
      className: r.className,
      sources: sourcesByLesson.get(r.lessonId) ?? [],
    }));
  }
}
