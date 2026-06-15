/** API types — mirror the backend DTOs (spec 001). */

export type UserRole =
  | 'super_admin'
  | 'institute_manager'
  | 'teacher'
  | 'student';

export type StudyDegree =
  | 'secondary'
  | 'diploma'
  | 'bachelor'
  | 'master'
  | 'phd';

export type TajweedLevel =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'acceptable'
  | 'weak';

export interface TeacherDetails {
  studyDegree: StudyDegree | null;
  studyField: string | null;
  quranPartsMemorized: number | null;
  tajweedLevel: TajweedLevel | null;
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  birthDate: string | null;
  phone: string | null;
  schoolGrade: string | null;
  instituteId: string | null;
  teacherDetails?: TeacherDetails;
  createdAt: string;
}

export interface Certification {
  id: string;
  title: string;
  createdAt: string;
}

export interface StudentNote {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  teacher: User;
  classes: { id: string; name: string }[];
  certifications: Certification[];
}

export interface StudentProfile {
  student: User;
  currentClass: { id: string; name: string } | null;
}

export type Weekday = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
export type Prayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type AnchorKind = 'time' | 'prayer';

export interface Anchor {
  kind: AnchorKind;
  value: string; // 'HH:MM' when time, prayer key when prayer
}

export interface ScheduleSlot {
  id?: string;
  dayOfWeek: Weekday;
  start: Anchor;
  end: Anchor | null;
}

export interface ClassProfile {
  class: { id: string; name: string; description: string | null; createdAt: string };
  schedule: (ScheduleSlot & { id: string })[];
  teachers: { id: string; name: string; isSupervisor: boolean }[];
  students: { id: string; name: string; schoolGrade: string | null }[];
}

export interface InstituteStats {
  employees: number;
  teachers: number;
  students: number;
  classes: number;
}

export type RecitationRating =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'acceptable'
  | 'weak';

export interface Surah {
  number: number;
  name: string;
  ayahCount: number;
}

export interface RecitationLogItem {
  id: string;
  studentId: string;
  studentName?: string;
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
  rating: RecitationRating | null;
  coveredAyahs: number;
  percent: number;
  nextAyah: number | null;
  ranges: [number, number][];
}

export interface StudentRecitation {
  summary: {
    lastRecitation: RecitationLogItem | null;
    fullCount: number;
    partialCount: number;
    totalRecitations: number;
  };
  heart: HeartCell[];
  log: RecitationLogItem[];
}

export interface ClassRecitation {
  log: RecitationLogItem[];
  students: { id: string; name: string }[];
}

export interface AddRecitationInput {
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  rating: RecitationRating;
}

// ── Attendance (الحضور) — spec 007 ──
export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

export interface AttendanceCounts {
  present: number;
  absent: number;
  justified: number;
  late: number;
}

export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  counts: AttendanceCounts;
  total: number;
  rate: number;
}

export interface AttendanceSessionSummary {
  date: string;
  counts: AttendanceCounts;
  total: number;
}

export interface ClassAttendance {
  totals: AttendanceCounts;
  rate: number;
  sessionCount: number;
  sessions: AttendanceSessionSummary[];
  students: StudentAttendanceStats[];
  roster: { id: string; name: string }[];
}

export interface StudentAttendanceItem {
  date: string;
  status: AttendanceStatus;
}

export interface StudentAttendance {
  counts: AttendanceCounts;
  total: number;
  rate: number;
  log: StudentAttendanceItem[];
}

export interface SessionDetail {
  date: string;
  entries: { studentId: string; status: AttendanceStatus }[];
}

export interface TakeAttendanceInput {
  date: string;
  entries: { studentId: string; status: AttendanceStatus }[];
}

export interface UpdateInstituteInput {
  name: string;
  place: string;
  description?: string;
  logoUrl?: string;
}

export interface BasicInfoInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  schoolGrade?: string;
}

export interface Institute {
  id: string;
  name: string;
  place: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export interface ClassItem {
  id: string;
  instituteId: string;
  name: string;
  description: string | null;
  createdAt: string;
  teacherIds: string[];
  supervisorId: string | null;
  studentIds: string[];
}

export interface MemberInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  username: string;
  password: string;
}

export interface StudentInput extends MemberInput {
  schoolGrade?: string;
}

export interface CreateInstituteInput {
  name: string;
  place: string;
  description?: string;
  logoUrl?: string;
  manager: MemberInput;
}
