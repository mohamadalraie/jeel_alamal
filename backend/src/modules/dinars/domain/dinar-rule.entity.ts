import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import { DinarContext, DinarTrigger } from './dinar-context';

const NAME_MAX = 100;

/** Contexts a manager may pick for a manual rule (attendance is system-only). */
const MANUAL_CONTEXTS: DinarContext[] = [
  DinarContext.Lesson,
  DinarContext.Recitation,
];

interface DinarRuleProps {
  instituteId: string;
  name: string;
  amount: number;
  context: DinarContext;
  trigger: DinarTrigger;
  systemKey: string | null;
  isActive: boolean;
  isProtected: boolean;
  createdAt: Date;
}

function assertName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw new BusinessRuleError('Rule name is required');
  if (trimmed.length > NAME_MAX) {
    throw new BusinessRuleError(`Rule name must be ≤ ${NAME_MAX} characters`);
  }
}

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new BusinessRuleError('Dinar amount must be a whole number');
  }
  if (amount === 0)
    throw new BusinessRuleError('Dinar amount must be non-zero');
}

/**
 * A dinar rule (قاعدة الدنانير) — the single dynamic unit of the reward system
 * (spec 010). Manual rules are created freely by managers; system rules are
 * seeded, protected slots whose amount + active state a manager configures.
 */
export class DinarRule extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: DinarRuleProps,
  ) {
    super(id);
  }

  /** Manager-created manual rule (context lesson | recitation). */
  static create(input: {
    instituteId: string;
    name: string;
    amount: number;
    context: DinarContext;
  }): DinarRule {
    assertName(input.name);
    assertAmount(input.amount);
    if (!MANUAL_CONTEXTS.includes(input.context)) {
      throw new BusinessRuleError(
        'Manual rule context must be lesson or recitation',
      );
    }
    return new DinarRule(randomUUID(), {
      instituteId: input.instituteId,
      name: input.name.trim(),
      amount: input.amount,
      context: input.context,
      trigger: DinarTrigger.Manual,
      systemKey: null,
      isActive: true,
      isProtected: false,
      createdAt: new Date(),
    });
  }

  /** Seed a protected system rule (default amount 0, inactive). */
  static createSystem(input: {
    instituteId: string;
    name: string;
    systemKey: string;
    context: DinarContext;
  }): DinarRule {
    return new DinarRule(randomUUID(), {
      instituteId: input.instituteId,
      name: input.name,
      amount: 0,
      context: input.context,
      trigger: DinarTrigger.Automatic,
      systemKey: input.systemKey,
      isActive: false,
      isProtected: true,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: DinarRuleProps): DinarRule {
    return new DinarRule(id, props);
  }

  /** Rename — rejected on protected (system) rules. */
  rename(name: string): void {
    if (this.props.isProtected) {
      throw new BusinessRuleError('System rules cannot be renamed');
    }
    assertName(name);
    this.props.name = name.trim();
  }

  /** Change dinar value — allowed on protected rules (managers re-value them). */
  setAmount(amount: number): void {
    assertAmount(amount);
    this.props.amount = amount;
  }

  setActive(active: boolean): void {
    this.props.isActive = active;
  }

  /** Throws if the rule may not be deleted (system rules never can). */
  assertDeletable(): void {
    if (this.props.isProtected) {
      throw new BusinessRuleError('System rules cannot be deleted');
    }
  }

  get instituteId(): string {
    return this.props.instituteId;
  }
  get name(): string {
    return this.props.name;
  }
  get amount(): number {
    return this.props.amount;
  }
  get context(): DinarContext {
    return this.props.context;
  }
  get trigger(): DinarTrigger {
    return this.props.trigger;
  }
  get systemKey(): string | null {
    return this.props.systemKey;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get isProtected(): boolean {
    return this.props.isProtected;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
