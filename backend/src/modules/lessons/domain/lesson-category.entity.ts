import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

interface LessonCategoryProps {
  instituteId: string;
  name: string;
  color: string;
  createdAt: Date;
}

/** A dynamic, per-institute lesson category (name + color) — spec 008. */
export class LessonCategory extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: LessonCategoryProps,
  ) {
    super(id);
  }

  static create(input: {
    instituteId: string;
    name: string;
    color: string;
  }): LessonCategory {
    const name = input.name.trim();
    const color = input.color.trim();
    if (name.length < 1) throw new BusinessRuleError('Category name is required');
    if (color.length < 1) throw new BusinessRuleError('Category color is required');
    return new LessonCategory(randomUUID(), {
      instituteId: input.instituteId,
      name,
      color,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: LessonCategoryProps): LessonCategory {
    return new LessonCategory(id, props);
  }

  rename(name: string, color: string): void {
    const n = name.trim();
    const c = color.trim();
    if (n.length < 1) throw new BusinessRuleError('Category name is required');
    if (c.length < 1) throw new BusinessRuleError('Category color is required');
    this.props.name = n;
    this.props.color = c;
  }

  get instituteId() {
    return this.props.instituteId;
  }
  get name() {
    return this.props.name;
  }
  get color() {
    return this.props.color;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
