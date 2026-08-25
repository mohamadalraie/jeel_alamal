import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AttendanceSessionProps {
  instituteId: string;
  classId: string;
  /** The lesson day, 'YYYY-MM-DD'. One session per class per date. */
  date: string;
  takenBy: string;
  createdAt: Date;
}

/**
 * One attendance-taking event for a class on a given date (spec 007). The date
 * is validated at construction so a malformed session can never be stored.
 */
export class AttendanceSession extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: AttendanceSessionProps,
  ) {
    super(id);
  }

  static create(input: {
    instituteId: string;
    classId: string;
    date: string;
    takenBy: string;
  }): AttendanceSession {
    if (!DATE.test(input.date)) {
      throw new BusinessRuleError(
        'Attendance date must be in YYYY-MM-DD format',
      );
    }
    if (Number.isNaN(Date.parse(input.date))) {
      throw new BusinessRuleError('Attendance date is not a valid date');
    }
    return new AttendanceSession(randomUUID(), {
      ...input,
      createdAt: new Date(),
    });
  }

  static reconstitute(
    id: string,
    props: AttendanceSessionProps,
  ): AttendanceSession {
    return new AttendanceSession(id, props);
  }

  get instituteId() {
    return this.props.instituteId;
  }
  get classId() {
    return this.props.classId;
  }
  get date() {
    return this.props.date;
  }
  get takenBy() {
    return this.props.takenBy;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
