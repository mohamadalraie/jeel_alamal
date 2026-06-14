import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { RecitationRating } from './recitation-rating';
import { assertValidRange } from './quran';

interface RecitationProps {
  instituteId: string;
  studentId: string;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  rating: RecitationRating;
  recitedBy: string;
  createdAt: Date;
}

/**
 * A single recitation (تسميع) session for a student. Validates the surah/ayah
 * range at construction so an out-of-range recitation can never exist.
 */
export class Recitation extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: RecitationProps,
  ) {
    super(id);
  }

  static create(input: {
    instituteId: string;
    studentId: string;
    surahNumber: number;
    fromAyah: number;
    toAyah: number;
    rating: RecitationRating;
    recitedBy: string;
  }): Recitation {
    assertValidRange(input.surahNumber, input.fromAyah, input.toAyah);
    return new Recitation(randomUUID(), { ...input, createdAt: new Date() });
  }

  static reconstitute(id: string, props: RecitationProps): Recitation {
    return new Recitation(id, props);
  }

  get instituteId() {
    return this.props.instituteId;
  }
  get studentId() {
    return this.props.studentId;
  }
  get surahNumber() {
    return this.props.surahNumber;
  }
  get fromAyah() {
    return this.props.fromAyah;
  }
  get toAyah() {
    return this.props.toAyah;
  }
  get rating() {
    return this.props.rating;
  }
  get recitedBy() {
    return this.props.recitedBy;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
