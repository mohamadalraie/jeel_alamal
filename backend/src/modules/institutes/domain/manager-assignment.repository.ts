export const MANAGER_ASSIGNMENTS = Symbol('MANAGER_ASSIGNMENTS');

/**
 * Port for the manager↔institute many-to-many assignment. The single source of
 * truth for "may this manager act on this institute?" — every manager-scoped
 * use-case (here and in other modules) checks through this port.
 */
export interface ManagerAssignmentRepository {
  isAssigned(managerId: string, instituteId: string): Promise<boolean>;
  assign(managerId: string, instituteId: string): Promise<void>;
}
