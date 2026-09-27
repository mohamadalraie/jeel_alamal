import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';

interface LessonSubjectProps {
  instituteId: string;
  name: string;
  color: string | null;
  archivedAt: Date | null;
  createdAt: Date;
}

/**
 * A managed lesson subject (مادة) — institute-scoped entity, similar to
 * LessonCategory. Subjects can be archived (soft-deleted) instead of hard-deleted
 * so historical lessons retain their subject reference.
 */
export class LessonSubject extends Entity<string> {
  private constructor(
    id: string,
    private props: LessonSubjectProps,
  ) {
    super(id);
  }

  static create(input: {
    instituteId: string;
    name: string;
    color?: string | null;
  }): LessonSubject {
    return new LessonSubject(randomUUID(), {
      instituteId: input.instituteId,
      name: input.name.trim(),
      color: input.color?.trim() || null,
      archivedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(
    id: string,
    props: LessonSubjectProps,
  ): LessonSubject {
    return new LessonSubject(id, props);
  }

  update(name: string, color?: string | null): void {
    this.props.name = name.trim();
    this.props.color = color !== undefined ? (color?.trim() || null) : this.props.color;
  }

  archive(): void {
    this.props.archivedAt = new Date();
  }

  unarchive(): void {
    this.props.archivedAt = null;
  }

  get instituteId() { return this.props.instituteId; }
  get name() { return this.props.name; }
  get color() { return this.props.color; }
  get archivedAt() { return this.props.archivedAt; }
  get isArchived() { return this.props.archivedAt !== null; }
  get createdAt() { return this.props.createdAt; }
}
