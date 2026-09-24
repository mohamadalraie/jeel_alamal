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

export interface TeacherLessonStats {
  totalLessons: number;
  finishedLessons: number;
  pendingLessons: number;
  notGivenLessons: number;
  completionRate: number;
  averageDurationMinutes: number | null;
}

export interface TeacherLessonsProfile {
  stats: TeacherLessonStats;
  lessons: ProgramEntry[];
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

export type TrackType = 'regular' | 'intensive';

export interface ScheduleSlot {
  id?: string;
  dayOfWeek: Weekday;
  start: Anchor;
  end: Anchor | null;
  trackType?: TrackType;
}

export interface ClassProfile {
  class: {
    id: string;
    name: string;
    description: string | null;
    lessonsVisibleToStudents: boolean;
    isIntensive: boolean;
    createdAt: string;
  };
  schedule: (ScheduleSlot & { id: string })[];
  teachers: { id: string; name: string; isSupervisor: boolean }[];
  students: {
    id: string;
    name: string;
    schoolGrade: string | null;
    isIntensive?: boolean;
  }[];
}

export interface InstituteStats {
  teachers: number;
  students: number;
  classes: number;
}

export interface ManagerAnalytics {
  counts: {
    teachers: number;
    students: number;
    classes: number;
  };
  attendance: {
    overallRate: number;
    present: number;
    absent: number;
    late: number;
    justified: number;
    totalRecords: number;
  };
  recitation: {
    totalAyahs: number;
    totalSessions: number;
    ratings: Record<string, number>;
  };
  dinars: {
    totalAwarded: number;
  };
  quranProgress: {
    zeroTo9Parts: number;
    tenTo19Parts: number;
    twentyTo29Parts: number;
    khatim: number;
  };
  topClasses: {
    id: string;
    name: string;
    studentCount: number;
    attendanceRate: number;
    totalAyahs: number;
  }[];
  topTeachers: {
    id: string;
    name: string;
    classesCount: number;
    dinarsAwarded: number;
  }[];
  attendanceTrend: {
    weekLabel: string;
    present: number;
    absent: number;
    late: number;
  }[];
}

export interface TeacherAnalytics {
  teacherInfo: {
    id: string;
    name: string;
  };
  assignedClasses: {
    id: string;
    name: string;
    studentCount: number;
  }[];
  totalStudents: number;
  classAttendanceRate: number;
  totalRecitationsVerified: number;
  totalDinarsAwarded: number;
  studentsNeedingAttention: {
    studentId: string;
    name: string;
    className: string;
    attendanceRate: number;
    daysSinceLastRecitation: number | null;
    reason: string;
  }[];
  studentsPerformance: {
    studentId: string;
    name: string;
    className: string;
    attendanceRate: number;
    totalAyahs: number;
    dinarsBalance: number;
  }[];
}

export interface StudentAnalytics {
  studentInfo: {
    id: string;
    name: string;
    className: string | null;
  };
  recitation: {
    totalAyahs: number;
    totalSessions: number;
    estimatedParts: number;
    ratings: Record<string, number>;
  };
  attendance: {
    rate: number;
    present: number;
    absent: number;
    late: number;
    justified: number;
    totalSessions: number;
  };
  dinars: {
    balance: number;
    rankInClass: number | null;
    rankInInstitute: number | null;
    contextBreakdown: Record<string, number>;
  };
  dailyRecitationHistory: {
    date: string;
    ayahs: number;
  }[];
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
  trackType?: TrackType;
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
  trackType?: TrackType;
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
  trackType?: TrackType;
  entries: { studentId: string; status: AttendanceStatus }[];
}

export interface TakeAttendanceInput {
  date: string;
  trackType?: TrackType;
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
  intensiveTrackEnabled: boolean;
  createdAt: string;
}

export interface ClassItem {
  id: string;
  instituteId: string;
  name: string;
  description: string | null;
  isIntensive: boolean;
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
  existingManagerId?: string;
  manager?: MemberInput;
}

// ── Lessons program (الدروس) — spec 008 ──
export type LessonKind = 'lesson' | 'recitation';
export type LessonSourceKind = 'link' | 'image' | 'pdf';

// ── Lesson lifecycle — spec 009 ──
export type LessonBindingStatus =
  | 'pending'
  | 'started'
  | 'finished'
  | 'not_given'
  | 'over_time'
  | 'under_time';

export interface LessonSettings {
  durationThresholdMinutes: number;
  durationStatusEnabled: boolean;
}

/** The teacher timer page payload for one lesson-class binding. */
export interface LessonTimer {
  lessonClassId: string;
  kind: LessonKind;
  name: string | null;
  date: string;
  className: string;
  expectedDurationMinutes: number | null;
  status: LessonBindingStatus;
  actualStartTime: string | null;
  ordinal: number;
  ofTotal: number;
  classId?: string;
  instituteId?: string;
}

/** Result of ending a lesson. */
export interface EndLessonResult {
  status: LessonBindingStatus;
  actualDurationMinutes: number;
}

export interface LessonCategory {
  id: string;
  name: string;
  color: string;
}

export interface LessonSourceInput {
  kind: LessonSourceKind;
  url: string;
  description?: string;
}

export interface LessonSourceView {
  kind: LessonSourceKind;
  url: string;
  description: string | null;
}

export interface LessonAssignmentInput {
  classId: string;
  teacherId: string;
}

export interface CreateLessonInput {
  kind: LessonKind;
  name?: string;
  description?: string;
  categoryId?: string;
  date: string; // YYYY-MM-DD
  expectedDurationMinutes?: number | null;
  sources?: LessonSourceInput[];
  assignments: LessonAssignmentInput[];
}

export type UpdateLessonInput = Partial<CreateLessonInput>;

export interface ProgramEntry {
  lessonClassId: string;
  lessonId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  category: LessonCategory | null;
  date: string;
  sort: number;
  expectedDurationMinutes: number | null;
  status: LessonBindingStatus;
  actualStartTime: string | null;
  actualEndTime: string | null;
  teacher: { id: string; name: string };
  className: string;
  sources: LessonSourceView[];
}

export interface ClassProgram {
  lessonsVisibleToStudents: boolean;
  entries: ProgramEntry[];
}

export interface TeacherLessonEntry extends ProgramEntry {
  isNext: boolean;
}

export interface StudentLessonEntry {
  lessonClassId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  date: string;
}

/** One lesson in the institute-wide manager hub, grouped across its classes. */
export interface InstituteLesson {
  lessonId: string;
  kind: LessonKind;
  name: string | null;
  description: string | null;
  category: LessonCategory | null;
  date: string;
  expectedDurationMinutes: number | null;
  sources: LessonSourceView[];
  classes: {
    lessonClassId: string;
    classId: string;
    className: string;
    teacher: { id: string; name: string };
    status: LessonBindingStatus;
    actualStartTime: string | null;
    actualEndTime: string | null;
  }[];
}

// ── Dinars (نظام الدنانير) — spec 010 ──
export type DinarContext = 'lesson' | 'recitation' | 'attendance' | 'general';

export interface DinarRule {
  id: string;
  name: string;
  amount: number;
  context: DinarContext;
  trigger: 'manual' | 'automatic';
  systemKey: string | null;
  isActive: boolean;
  isProtected: boolean;
  createdAt: string;
}

export interface DinarRules {
  manual: DinarRule[];
  system: DinarRule[];
}

export interface DinarLedgerItem {
  id: string;
  amount: number;
  context: DinarContext;
  sourceType: 'manual_rule' | 'exceptional' | 'attendance' | 'recitation';
  label: string;
  awardedByName: string | null;
  reversesId: string | null;
  reversedAt: string | null;
  createdAt: string;
}

export interface DinarSummary {
  net: number;
  positive: number;
  negative: number;
  count: number;
}

export interface StudentDinars {
  summary: DinarSummary;
  ledger: DinarLedgerItem[];
}

export interface DinarLeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  balance: number;
}

export interface DinarLeaderboard {
  scope: 'institute' | 'class';
  rows: DinarLeaderboardRow[];
}

export interface CreateDinarRuleInput {
  name: string;
  amount: number;
  context: 'lesson' | 'recitation';
}

export interface UpdateDinarRuleInput {
  name?: string;
  amount?: number;
  isActive?: boolean;
}

export interface AwardDinarInput {
  ruleId?: string;
  amount?: number;
  reason?: string;
  context?: DinarContext;
}

export interface BulkAwardDinarInput extends AwardDinarInput {
  studentIds: string[];
}
