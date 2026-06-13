import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

/**
 * A note written about a student by a staff member (spec 002). Records its
 * author and timestamps. Students can never read notes — enforced in the
 * use-cases, never exposed to a student actor.
 */
export class StudentNote extends Entity<string> {
  private constructor(
    id: string,
    private props: {
      studentId: string;
      authorId: string;
      body: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    super(id);
  }

  static create(input: {
    studentId: string;
    authorId: string;
    body: string;
  }): StudentNote {
    const body = input.body.trim();
    if (body.length < 1) {
      throw new BusinessRuleError('Note cannot be empty');
    }
    const now = new Date();
    return new StudentNote(randomUUID(), {
      studentId: input.studentId,
      authorId: input.authorId,
      body,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(
    id: string,
    props: {
      studentId: string;
      authorId: string;
      body: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ): StudentNote {
    return new StudentNote(id, props);
  }

  edit(body: string): void {
    const trimmed = body.trim();
    if (trimmed.length < 1) {
      throw new BusinessRuleError('Note cannot be empty');
    }
    this.props.body = trimmed;
    this.props.updatedAt = new Date();
  }

  get studentId(): string {
    return this.props.studentId;
  }
  get authorId(): string {
    return this.props.authorId;
  }
  get body(): string {
    return this.props.body;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
