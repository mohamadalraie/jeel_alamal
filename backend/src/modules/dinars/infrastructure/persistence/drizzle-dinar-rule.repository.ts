import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { DinarRule } from '../../domain/dinar-rule.entity';
import { DinarContext, DinarTrigger } from '../../domain/dinar-context';
import type { DinarRuleRepository } from '../../domain/dinar-rule.repository';
import { SYSTEM_RULE_DEFAULTS } from '../../domain/system-rule-keys';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { dinarRules, type DinarRuleRow } from './dinar.schema';

const toDomain = (r: DinarRuleRow): DinarRule =>
  DinarRule.reconstitute(r.id, {
    instituteId: r.instituteId,
    name: r.name,
    amount: r.amount,
    context: r.context as DinarContext,
    trigger: r.trigger as DinarTrigger,
    systemKey: r.systemKey,
    isActive: r.isActive,
    isProtected: r.isProtected,
    createdAt: r.createdAt,
  });

const toRow = (rule: DinarRule) => ({
  id: rule.id,
  instituteId: rule.instituteId,
  name: rule.name,
  amount: rule.amount,
  context: rule.context,
  trigger: rule.trigger,
  systemKey: rule.systemKey,
  isActive: rule.isActive,
  isProtected: rule.isProtected,
  createdAt: rule.createdAt,
});

/** Human default names for the seeded system rules (localised in the UI). */
const SYSTEM_RULE_NAME: Record<string, string> = {
  'attendance.present': 'حضور',
  'attendance.absent': 'غياب',
  'attendance.justified': 'غياب بعذر',
  'attendance.late': 'تأخّر',
  'recitation.excellent': 'تسميع ممتاز',
  'recitation.very_good': 'تسميع جيد جداً',
  'recitation.good': 'تسميع جيد',
  'recitation.acceptable': 'تسميع مقبول',
  'recitation.weak': 'تسميع ضعيف',
};

@Injectable()
export class DrizzleDinarRuleRepository implements DinarRuleRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findManualByInstitute(instituteId: string): Promise<DinarRule[]> {
    const rows = await this.db
      .select()
      .from(dinarRules)
      .where(
        and(
          eq(dinarRules.instituteId, instituteId),
          isNull(dinarRules.systemKey),
        ),
      );
    return rows.map(toDomain);
  }

  async findSystemByInstitute(instituteId: string): Promise<DinarRule[]> {
    const rows = await this.db
      .select()
      .from(dinarRules)
      .where(
        and(
          eq(dinarRules.instituteId, instituteId),
          isNotNull(dinarRules.systemKey),
        ),
      );
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<DinarRule | null> {
    const [row] = await this.db
      .select()
      .from(dinarRules)
      .where(eq(dinarRules.id, id));
    return row ? toDomain(row) : null;
  }

  async save(rule: DinarRule): Promise<void> {
    const row = toRow(rule);
    await this.db
      .insert(dinarRules)
      .values(row)
      .onConflictDoUpdate({
        target: dinarRules.id,
        set: {
          name: row.name,
          amount: row.amount,
          isActive: row.isActive,
        },
      });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(dinarRules).where(eq(dinarRules.id, id));
  }

  async seedSystemRules(instituteId: string): Promise<void> {
    const existing = await this.findSystemByInstitute(instituteId);
    const have = new Set(existing.map((r) => r.systemKey));
    const missing = SYSTEM_RULE_DEFAULTS.filter((d) => !have.has(d.systemKey));
    if (missing.length === 0) return;
    const rules = missing.map((d) =>
      DinarRule.createSystem({
        instituteId,
        systemKey: d.systemKey,
        context: d.context,
        name: SYSTEM_RULE_NAME[d.systemKey] ?? d.systemKey,
      }),
    );
    await this.db.insert(dinarRules).values(rules.map(toRow));
  }
}
