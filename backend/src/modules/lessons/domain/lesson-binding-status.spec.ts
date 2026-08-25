import { deriveReadStatus } from './lesson-binding-status';
import { LessonClassBinding } from './lesson-class-binding.entity';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

describe('deriveReadStatus (spec 009)', () => {
  it('surfaces a past pending binding as not_given', () => {
    expect(deriveReadStatus('pending', '2026-07-01', '2026-07-05')).toBe(
      'not_given',
    );
  });

  it('keeps a today/future pending binding as pending', () => {
    expect(deriveReadStatus('pending', '2026-07-05', '2026-07-05')).toBe(
      'pending',
    );
    expect(deriveReadStatus('pending', '2026-07-09', '2026-07-05')).toBe(
      'pending',
    );
  });

  it('never rewrites a non-pending status', () => {
    expect(deriveReadStatus('started', '2026-07-01', '2026-07-05')).toBe(
      'started',
    );
    expect(deriveReadStatus('finished', '2026-07-01', '2026-07-05')).toBe(
      'finished',
    );
    expect(deriveReadStatus('over_time', '2026-07-01', '2026-07-05')).toBe(
      'over_time',
    );
  });
});

describe('LessonClassBinding lifecycle (spec 009)', () => {
  const make = () =>
    LessonClassBinding.create({
      lessonId: 'l1',
      classId: 'c1',
      teacherId: 't1',
    });

  it('starts from pending and records the start time', () => {
    const b = make();
    const now = new Date('2026-07-05T09:00:00Z');
    b.start(now);
    expect(b.status).toBe('started');
    expect(b.actualStartTime).toBe(now);
  });

  it('refuses to start twice', () => {
    const b = make();
    b.start(new Date());
    expect(() => b.start(new Date())).toThrow(BusinessRuleError);
  });

  it('refuses to end before starting', () => {
    expect(() => make().end(new Date())).toThrow(BusinessRuleError);
  });

  it('returns ceil-minutes on end and records end time', () => {
    const b = make();
    b.start(new Date('2026-07-05T09:00:00Z'));
    const mins = b.end(new Date('2026-07-05T09:44:20Z')); // 44m20s → 45
    expect(mins).toBe(45);
    expect(b.actualEndTime).toEqual(new Date('2026-07-05T09:44:20Z'));
  });

  it('never returns less than 1 minute', () => {
    const b = make();
    const t = new Date('2026-07-05T09:00:00Z');
    b.start(t);
    expect(b.end(new Date('2026-07-05T09:00:01Z'))).toBe(1);
  });

  it('applyStatus sets the terminal status', () => {
    const b = make();
    b.start(new Date());
    b.end(new Date());
    b.applyStatus('over_time');
    expect(b.status).toBe('over_time');
  });
});
