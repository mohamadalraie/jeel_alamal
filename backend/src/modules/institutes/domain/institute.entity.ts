import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

interface InstituteProps {
  name: string;
  place: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: Date;
}

/**
 * Institute aggregate root — the tenant of the platform. Every tenant-owned
 * record in the system hangs off an institute (constitution II).
 */
export class Institute extends Entity<string> {
  private props: InstituteProps;

  private constructor(id: string, props: InstituteProps) {
    super(id);
    this.props = props;
  }

  static create(input: {
    name: string;
    place: string;
    description?: string | null;
    logoUrl?: string | null;
  }): Institute {
    const name = input.name.trim();
    const place = input.place.trim();
    if (name.length < 2) {
      throw new BusinessRuleError('Institute name must be at least 2 characters');
    }
    if (place.length < 2) {
      throw new BusinessRuleError('Institute place must be at least 2 characters');
    }
    return new Institute(randomUUID(), {
      name,
      place,
      description: input.description?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: InstituteProps): Institute {
    return new Institute(id, props);
  }

  edit(input: {
    name: string;
    place: string;
    description?: string | null;
    logoUrl?: string | null;
  }): void {
    const name = input.name.trim();
    const place = input.place.trim();
    if (name.length < 2) {
      throw new BusinessRuleError('Institute name must be at least 2 characters');
    }
    if (place.length < 2) {
      throw new BusinessRuleError('Institute place must be at least 2 characters');
    }
    this.props.name = name;
    this.props.place = place;
    this.props.description = input.description?.trim() || null;
    this.props.logoUrl = input.logoUrl?.trim() || null;
  }

  get name(): string {
    return this.props.name;
  }
  get place(): string {
    return this.props.place;
  }
  get description(): string | null {
    return this.props.description;
  }
  get logoUrl(): string | null {
    return this.props.logoUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
