import { LessonSettings } from './lesson-settings.entity';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

describe('LessonSettings.evaluate (spec 009)', () => {
  const settings = (threshold: number, enabled = true) => {
    const s = LessonSettings.defaults('inst-1');
    s.update({
      durationThresholdMinutes: threshold,
      durationStatusEnabled: enabled,
    });
    return s;
  };

  it('is finished within the threshold band (inclusive boundary)', () => {
    const s = settings(10);
    expect(s.evaluate(45, 45)).toBe('finished');
    expect(s.evaluate(55, 45)).toBe('finished'); // exactly expected + threshold
    expect(s.evaluate(35, 45)).toBe('finished'); // exactly expected - threshold
  });

  it('is over_time when actual exceeds expected + threshold', () => {
    expect(settings(10).evaluate(56, 45)).toBe('over_time');
  });

  it('is under_time when actual is below expected - threshold', () => {
    expect(settings(10).evaluate(34, 45)).toBe('under_time');
  });

  it('is always finished when evaluation is disabled', () => {
    expect(settings(10, false).evaluate(200, 45)).toBe('finished');
  });

  it('is always finished when the threshold is 0', () => {
    expect(settings(0).evaluate(200, 45)).toBe('finished');
  });

  it('is always finished when there is no expected duration', () => {
    expect(settings(10).evaluate(200, null)).toBe('finished');
  });

  it('rejects an out-of-range threshold', () => {
    const s = LessonSettings.defaults('inst-1');
    expect(() =>
      s.update({ durationThresholdMinutes: -1, durationStatusEnabled: true }),
    ).toThrow(BusinessRuleError);
    expect(() =>
      s.update({ durationThresholdMinutes: 121, durationStatusEnabled: true }),
    ).toThrow(BusinessRuleError);
  });

  it('defaults to threshold 10 and enabled', () => {
    const s = LessonSettings.defaults('inst-1');
    expect(s.durationThresholdMinutes).toBe(10);
    expect(s.durationStatusEnabled).toBe(true);
  });
});
