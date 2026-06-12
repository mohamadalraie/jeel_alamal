import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

interface ClassProps {
  instituteId: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

/**
 * Class (حلقة) aggregate root. Belongs to one institute; has many teachers of
 * whom exactly one is supervisor, and many students. Memberships are managed
 * through the ClassRepository port (and the one-supervisor rule is additionally
 * enforced by a partial unique index in the database).
 */
export class Class extends Entity<string> {
  private props: ClassProps;

  private constructor(id: string, props: ClassProps) {
    super(id);
    this.props = props;
  }

  static create(input: {
    instituteId: string;
    name: string;
    description?: string | null;
  }): Class {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new BusinessRuleError('Class name must be at least 2 characters');
    }
    if (!input.instituteId) {
      throw new BusinessRuleError('A class must belong to an institute');
    }
    return new Class(randomUUID(), {
      instituteId: input.instituteId,
      name,
      description: input.description?.trim() || null,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: ClassProps): Class {
    return new Class(id, props);
  }

  get instituteId(): string {
    return this.props.instituteId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | null {
    return this.props.description;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
