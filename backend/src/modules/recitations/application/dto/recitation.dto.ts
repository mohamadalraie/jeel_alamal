import { IsEnum, IsInt, IsUUID, Max, Min } from 'class-validator';
import { RecitationRating } from '../../domain/recitation-rating';

export class AddRecitationDto {
  @IsInt()
  @Min(1)
  @Max(114)
  surahNumber: number;

  @IsInt()
  @Min(1)
  fromAyah: number;

  @IsInt()
  @Min(1)
  toAyah: number;

  @IsEnum(RecitationRating)
  rating: RecitationRating;
}

export class StudentIdDto {
  @IsUUID()
  studentId: string;
}

export interface RecitationLogItem {
  id: string;
  studentId: string;
  studentName?: string; // included in class view
  surahNumber: number;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  rating: RecitationRating;
  recitedByName: string;
  createdAt: string;
}

export type SurahStatus = 'none' | 'partial' | 'full';

export interface HeartCell {
  number: number;
  name: string;
  ayahCount: number;
  status: SurahStatus;
  rating: RecitationRating | null; // latest rating, when any recitation exists
}

export interface StudentRecitationResult {
  summary: {
    lastRecitation: RecitationLogItem | null;
    fullCount: number;
    partialCount: number;
    totalRecitations: number;
  };
  heart: HeartCell[]; // 114 cells in surah order
  log: RecitationLogItem[];
}
