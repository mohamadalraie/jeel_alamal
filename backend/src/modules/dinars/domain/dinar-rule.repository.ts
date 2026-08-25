import { DinarRule } from './dinar-rule.entity';

export const DINAR_RULE_REPOSITORY = Symbol('DINAR_RULE_REPOSITORY');

export interface DinarRuleRepository {
  /** Manager-created manual rules for an institute. */
  findManualByInstitute(instituteId: string): Promise<DinarRule[]>;
  /** The seeded system rules for an institute (all 9, active or not). */
  findSystemByInstitute(instituteId: string): Promise<DinarRule[]>;
  findById(id: string): Promise<DinarRule | null>;
  save(rule: DinarRule): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * Ensure the fixed set of system rules exists for the institute, inserting any
   * that are missing with their defaults. Idempotent.
   */
  seedSystemRules(instituteId: string): Promise<void>;
}
