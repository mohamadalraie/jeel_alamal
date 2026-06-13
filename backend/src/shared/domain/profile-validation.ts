import { BusinessRuleError } from './domain.error';

/**
 * Domain-level validation reused by user creation and profile edits (spec 002).
 * The same rules also live on the DTOs (class-validator) so bad input is
 * rejected at the HTTP boundary — but the domain is the last line of defence.
 */
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

export function assertValidPhone(phone: string | null | undefined): void {
  if (phone == null || phone === '') return;
  if (!PHONE_PATTERN.test(phone)) {
    throw new BusinessRuleError(
      'Phone must be 7–15 digits, optionally starting with +',
    );
  }
}

export function assertBirthDateNotFuture(date: Date | null | undefined): void {
  if (date == null) return;
  // Compare date-only (ignore time-of-day) against today.
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date.getTime() > today.getTime()) {
    throw new BusinessRuleError('Birth date cannot be in the future');
  }
}

export function assertQuranPartsInRange(parts: number | null | undefined): void {
  if (parts == null) return;
  if (!Number.isInteger(parts) || parts < 0 || parts > 30) {
    throw new BusinessRuleError('Quran parts memorized must be between 0 and 30');
  }
}
