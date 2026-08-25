import { Lesson } from './lesson.entity';
import { LessonKind } from './lesson-kind';
import { LessonSourceKind } from './lesson-source-kind';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

const base = {
  instituteId: 'inst-1',
  date: '2026-07-01',
  createdBy: 'mgr-1',
};

describe('Lesson entity (spec 008)', () => {
  it('requires a name for a normal lesson', () => {
    expect(() =>
      Lesson.create({ ...base, kind: LessonKind.Lesson, name: '  ' }),
    ).toThrow(BusinessRuleError);
  });

  it('keeps name/description/category/sources for a lesson', () => {
    const lesson = Lesson.create({
      ...base,
      kind: LessonKind.Lesson,
      name: 'Fiqh',
      description: 'Intro',
      categoryId: 'cat-1',
      sources: [
        {
          kind: LessonSourceKind.Link,
          url: 'https://x',
          description: 'v',
          sort: 0,
        },
      ],
    });
    expect(lesson.name).toBe('Fiqh');
    expect(lesson.categoryId).toBe('cat-1');
    expect(lesson.sources).toHaveLength(1);
  });

  it('strips name/description/category/sources for a recitation entry', () => {
    const rec = Lesson.create({
      ...base,
      kind: LessonKind.Recitation,
      name: 'ignored',
      description: 'ignored',
      categoryId: 'cat-1',
      sources: [
        {
          kind: LessonSourceKind.Link,
          url: 'https://x',
          description: null,
          sort: 0,
        },
      ],
    });
    expect(rec.kind).toBe(LessonKind.Recitation);
    expect(rec.name).toBeNull();
    expect(rec.description).toBeNull();
    expect(rec.categoryId).toBeNull();
    expect(rec.sources).toHaveLength(0);
  });

  it('rejects an invalid date', () => {
    expect(() =>
      Lesson.create({
        ...base,
        date: '07-01-2026',
        kind: LessonKind.Lesson,
        name: 'X',
      }),
    ).toThrow(BusinessRuleError);
  });

  it('edit() re-applies recitation invariants are not needed but lesson edits persist', () => {
    const lesson = Lesson.create({
      ...base,
      kind: LessonKind.Lesson,
      name: 'A',
    });
    lesson.edit({ name: 'B', description: 'desc' });
    expect(lesson.name).toBe('B');
    expect(lesson.description).toBe('desc');
  });

  // ── Expected duration (spec 009) ──
  it('accepts no expected duration (null) and a positive integer', () => {
    const a = Lesson.create({ ...base, kind: LessonKind.Lesson, name: 'A' });
    expect(a.expectedDurationMinutes).toBeNull();
    const b = Lesson.create({
      ...base,
      kind: LessonKind.Lesson,
      name: 'B',
      expectedDurationMinutes: 45,
    });
    expect(b.expectedDurationMinutes).toBe(45);
  });

  it('rejects a zero, negative, or fractional expected duration', () => {
    for (const bad of [0, -5, 2.5]) {
      expect(() =>
        Lesson.create({
          ...base,
          kind: LessonKind.Lesson,
          name: 'X',
          expectedDurationMinutes: bad,
        }),
      ).toThrow(BusinessRuleError);
    }
  });

  it('edit() can set and clear the expected duration', () => {
    const lesson = Lesson.create({
      ...base,
      kind: LessonKind.Lesson,
      name: 'A',
    });
    lesson.edit({ expectedDurationMinutes: 30 });
    expect(lesson.expectedDurationMinutes).toBe(30);
    lesson.edit({ expectedDurationMinutes: null });
    expect(lesson.expectedDurationMinutes).toBeNull();
  });
});
