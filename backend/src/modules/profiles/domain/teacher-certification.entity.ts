import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

/**
 * A certification / course a teacher joined (المعاهد والدورات الشرعية).
 * A simple add/remove collection item owned by a teacher.
 */
export class TeacherCertification extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: {
      teacherId: string;
      title: string;
      createdAt: Date;
    },
  ) {
    super(id);
  }

  static create(input: { teacherId: string; title: string }): TeacherCertification {
    const title = input.title.trim();
    if (title.length < 2) {
      throw new BusinessRuleError('Certification title is too short');
    }
    return new TeacherCertification(randomUUID(), {
      teacherId: input.teacherId,
      title,
      createdAt: new Date(),
    });
  }

  static reconstitute(
    id: string,
    props: { teacherId: string; title: string; createdAt: Date },
  ): TeacherCertification {
    return new TeacherCertification(id, props);
  }

  get teacherId(): string {
    return this.props.teacherId;
  }
  get title(): string {
    return this.props.title;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
