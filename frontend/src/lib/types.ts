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

export interface ScheduleSlot {
  id?: string;
  dayOfWeek: Weekday;
  startTime: string; // 'HH:MM'
  endTime: string; // 'HH:MM'
}

export interface ClassProfile {
  class: { id: string; name: string; description: string | null; createdAt: string };
  schedule: (ScheduleSlot & { id: string })[];
  teachers: { id: string; name: string; isSupervisor: boolean }[];
  students: { id: string; name: string; schoolGrade: string | null }[];
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
