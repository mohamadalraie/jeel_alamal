import { UserRole } from '../domain/user-role';

/**
 * The authenticated actor performing a use-case. Built by the auth guard from
 * verified JWT claims — NEVER from client-supplied body/query values
 * (constitution II). Every protected use-case receives an Actor and applies
 * its own permission + tenant checks.
 */
export interface Actor {
  userId: string;
  role: UserRole;
  /** Set for teachers/students (their home institute). Null for global roles. */
  instituteId: string | null;
}
