/**
 * Canonical roles (constitution III). Shared across bounded contexts because
 * authorisation is a cross-cutting concern. Extensible — more roles later.
 */
export enum UserRole {
  SuperAdmin = 'super_admin',
  InstituteManager = 'institute_manager',
  Teacher = 'teacher',
  Student = 'student',
}

export const ALL_USER_ROLES = Object.values(UserRole);
