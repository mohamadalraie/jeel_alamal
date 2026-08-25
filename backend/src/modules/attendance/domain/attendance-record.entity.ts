import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { AttendanceStatus } from './attendance-status';

interface AttendanceRecordProps {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
}

/** One student's status within an attendance session (spec 007). */
export class AttendanceRecord extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: AttendanceRecordProps,
  ) {
    super(id);
  }

  static create(input: {
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
  }): AttendanceRecord {
    return new AttendanceRecord(randomUUID(), { ...input });
  }

  static reconstitute(
    id: string,
    props: AttendanceRecordProps,
  ): AttendanceRecord {
    return new AttendanceRecord(id, props);
  }

  get sessionId() {
    return this.props.sessionId;
  }
  get studentId() {
    return this.props.studentId;
  }
  get status() {
    return this.props.status;
  }
}
