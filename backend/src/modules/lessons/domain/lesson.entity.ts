import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';
import { LessonKind } from './lesson-kind';
import { LessonSourceKind } from './lesson-source-kind';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A source attached to a lesson (value object). */
export interface LessonSourceData {
  kind: LessonSourceKind;
  url: string;
  description: string | null;
  sort: number;
}

interface LessonProps {
  instituteId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  categoryId: string | null;
  date: string; // YYYY-MM-DD
  sources: LessonSourceData[];
  createdBy: string;
  createdAt: Date;
}

/**
 * The shared lesson definition (aggregate root) — stored once even when
 * scheduled for several classes. Per-class bindings live in LessonClassBinding.
 * Enforces the recitation invariants: a recitation entry carries no name,
 * description, category, or sources.
 */
export class Lesson extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: LessonProps,
  ) {
    super(id);
  }

  static create(input: {
    instituteId: string;
    kind: LessonKind;
    name?: string | null;
    description?: string | null;
    categoryId?: string | null;
    date: string;
    sources?: LessonSourceData[];
    createdBy: string;
  }): Lesson {
    if (!DATE.test(input.date) || Number.isNaN(Date.parse(input.date))) {
      throw new BusinessRuleError('Lesson date must be a valid YYYY-MM-DD');
    }
    const props = normalize({
      instituteId: input.instituteId,
      kind: input.kind,
      name: input.name ?? null,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      date: input.date,
      sources: input.sources ?? [],
      createdBy: input.createdBy,
      createdAt: new Date(),
    });
    return new Lesson(randomUUID(), props);
  }

  static reconstitute(id: string, props: LessonProps): Lesson {
    return new Lesson(id, props);
  }

  /** Update the shared content (kind is immutable after creation). */
  edit(input: {
    name?: string | null;
    description?: string | null;
    categoryId?: string | null;
    date?: string;
    sources?: LessonSourceData[];
  }): void {
    if (input.date !== undefined) {
      if (!DATE.test(input.date) || Number.isNaN(Date.parse(input.date))) {
        throw new BusinessRuleError('Lesson date must be a valid YYYY-MM-DD');
      }
      this.props.date = input.date;
    }
    if (input.name !== undefined) this.props.name = input.name;
    if (input.description !== undefined) this.props.description = input.description;
    if (input.categoryId !== undefined) this.props.categoryId = input.categoryId;
    if (input.sources !== undefined) this.props.sources = input.sources;
    const n = normalize(this.props);
    this.props.name = n.name;
    this.props.description = n.description;
    this.props.categoryId = n.categoryId;
    this.props.sources = n.sources;
  }

  get instituteId() {
    return this.props.instituteId;
  }
  get kind() {
    return this.props.kind;
  }
  get name() {
    return this.props.name;
  }
  get description() {
    return this.props.description;
  }
  get categoryId() {
    return this.props.categoryId;
  }
  get date() {
    return this.props.date;
  }
  get sources(): readonly LessonSourceData[] {
    return this.props.sources;
  }
  get createdBy() {
    return this.props.createdBy;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}

/** Apply kind invariants: recitation entries are field-less. */
function normalize(props: LessonProps): LessonProps {
  if (props.kind === LessonKind.Recitation) {
    return { ...props, name: null, description: null, categoryId: null, sources: [] };
  }
  const name = props.name?.trim() || null;
  if (!name) {
    throw new BusinessRuleError('A lesson must have a name');
  }
  return {
    ...props,
    name,
    description: props.description?.trim() || null,
    sources: props.sources.map((s, i) => ({
      kind: s.kind,
      url: s.url.trim(),
      description: s.description?.trim() || null,
      sort: s.sort ?? i,
    })),
  };
}
