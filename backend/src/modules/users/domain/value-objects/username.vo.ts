import { BusinessRuleError } from '../../../../shared/domain/domain.error';

/**
 * Username value object — the sole login identifier for all roles.
 * Normalised to lowercase; 3–30 chars of letters, digits, dot, underscore,
 * hyphen. An invalid Username can never exist in the domain.
 */
export class Username {
  private static readonly PATTERN = /^[a-z0-9._-]{3,30}$/;

  private constructor(private readonly value: string) {}

  static create(raw: string): Username {
    const normalised = raw.trim().toLowerCase();
    if (!Username.PATTERN.test(normalised)) {
      throw new BusinessRuleError(
        `Invalid username "${raw}" — 3-30 chars: letters, digits, ".", "_", "-"`,
      );
    }
    return new Username(normalised);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
