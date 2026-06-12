/**
 * Hashing PORT. The application layer depends on this abstraction so the
 * use-case stays free of bcrypt (an infrastructure concern). Bound to a
 * concrete adapter via this token in the Nest module.
 */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
