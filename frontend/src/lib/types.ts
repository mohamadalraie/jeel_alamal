/** API types — mirror the backend DTOs (spec 001). */

export type UserRole =
  | 'super_admin'
  | 'institute_manager'
  | 'teacher'
  | 'student';

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
  createdAt: string;
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
