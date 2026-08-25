import { Inject, Injectable } from '@nestjs/common';
import { DinarTransaction } from '../domain/dinar-transaction.entity';
import { DinarSourceType } from '../domain/dinar-source';
import {
  DINAR_RULE_REPOSITORY,
  type DinarRuleRepository,
} from '../domain/dinar-rule.repository';
import {
  DINAR_TRANSACTION_REPOSITORY,
  type DinarTransactionRepository,
} from '../domain/dinar-transaction.repository';

export interface ApplyRecitationDinarInput {
  instituteId: string;
  studentId: string;
  recitationId: string;
  rating: string; // RecitationRating value
  recitedBy: string;
}

/**
 * Apply the automatic dinar projection for a recitation, keyed by recitation id
 * (spec 010, US3). Idempotent: re-applying makes no change; if the matching
 * recitation rule is inactive/absent, any existing projection is removed. Called
 * by AddRecitationUseCase after it saves the recitation.
 */
@Injectable()
export class ApplyRecitationDinarUseCase {
  constructor(
    @Inject(DINAR_RULE_REPOSITORY) private readonly rules: DinarRuleRepository,
    @Inject(DINAR_TRANSACTION_REPOSITORY)
    private readonly txns: DinarTransactionRepository,
  ) {}

  async execute(input: ApplyRecitationDinarInput): Promise<void> {
    const key = `recitation.${input.rating}`;
    const [systemRules, existing] = await Promise.all([
      this.rules.findSystemByInstitute(input.instituteId),
      this.txns.findBySourceRef(DinarSourceType.Recitation, input.recitationId),
    ]);
    const rule =
      systemRules.find((r) => r.systemKey === key && r.isActive) ?? null;
    const current = existing[0] ?? null;

    if (!rule) {
      for (const t of existing) await this.txns.deleteById(t.id);
      return;
    }
    if (
      current &&
      current.ruleId === rule.id &&
      current.amount === rule.amount
    ) {
      return; // unchanged
    }
    if (current) await this.txns.deleteById(current.id);
    await this.txns.save(
      DinarTransaction.projectRecitation({
        instituteId: input.instituteId,
        studentId: input.studentId,
        rule,
        recitationId: input.recitationId,
        awardedBy: input.recitedBy,
      }),
    );
  }
}
