import type {
  BasicInfoInput,
  Certification,
  ClassItem,
  ClassProfile,
  CreateInstituteInput,
  Institute,
  InstituteStats,
  MemberInput,
  ScheduleSlot,
  StudentInput,
  StudentNote,
  StudentProfile,
  TeacherDetails,
  TeacherProfile,
  UpdateInstituteInput,
  User,
  Surah,
  StudentRecitation,
  ClassRecitation,
  AddRecitationInput,
  ClassAttendance,
  StudentAttendance,
  SessionDetail,
  TakeAttendanceInput,
  LessonCategory,
  ClassProgram,
  TeacherLessonEntry,
  StudentLessonEntry,
  CreateLessonInput,
  UpdateLessonInput,
} from './types';

/**
 * Typed API client. Auth travels via httpOnly cookies, so every request sends
 * `credentials: 'include'`. On a 401 the caller redirects to login.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Resolve an asset URL: relative /uploads paths are served by the backend origin. */
export function resolveAsset(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Upload an image file; returns the stored relative URL. */
export async function uploadImage(file: File): Promise<{ url: string }> {
  return uploadTo('/api/uploads/image', file);
}

export async function uploadPdf(file: File): Promise<{ url: string }> {
  return uploadTo('/api/uploads/pdf', file);
}

async function uploadTo(path: string, file: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body,
  });
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const b = (await res.json()) as { message?: string };
      message = b.message ?? message;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<{ url: string }>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      const m = body.message;
      message = Array.isArray(m) ? m.join(', ') : (m ?? message);
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message);
  }

  // Handle empty bodies (204, or 201/200 with no content) without throwing on
  // an empty res.json() — this was surfacing as a false "error" toast.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ── Health ──
export interface HealthResponse {
  status: string;
  service: string;
  db: string;
  timestamp: string;
}
export const getHealth = () => request<HealthResponse>('/health');

// ── Auth ──
export const login = (username: string, password: string) =>
  post<{ user: User }>('/api/auth/login', { username, password });
export const logout = () => post<{ success: boolean }>('/api/auth/logout');
export const getMe = () => request<{ user: User }>('/api/auth/me');

// ── Institutes ──
export const listInstitutes = () => request<Institute[]>('/api/institutes');
export const createInstitute = (input: CreateInstituteInput) =>
  post<{ institute: Institute; manager: User }>('/api/institutes', input);
export const updateInstitute = (id: string, input: UpdateInstituteInput) =>
  patch<Institute>(`/api/institutes/${id}`, input);

// ── Institute members ──
export const listTeachers = (instituteId: string) =>
  request<User[]>(`/api/institutes/${instituteId}/teachers`);
export const createTeacher = (instituteId: string, input: MemberInput) =>
  post<User>(`/api/institutes/${instituteId}/teachers`, input);
export const listStudents = (instituteId: string) =>
  request<User[]>(`/api/institutes/${instituteId}/students`);
export const createStudent = (instituteId: string, input: StudentInput) =>
  post<User>(`/api/institutes/${instituteId}/students`, input);
export const listManagers = (instituteId: string) =>
  request<User[]>(`/api/institutes/${instituteId}/managers`);
export const createManager = (instituteId: string, input: MemberInput) =>
  post<User>(`/api/institutes/${instituteId}/managers`, input);
export const removeManager = (instituteId: string, managerId: string) =>
  del<void>(`/api/institutes/${instituteId}/managers/${managerId}`);

// ── Classes (حلقات) ──
export const listClasses = (instituteId: string) =>
  request<ClassItem[]>(`/api/institutes/${instituteId}/classes`);
export const createClass = (
  instituteId: string,
  input: { name: string; description?: string },
) => post<ClassItem>(`/api/institutes/${instituteId}/classes`, input);
export const addClassTeacher = (classId: string, userId: string) =>
  post<void>(`/api/classes/${classId}/teachers`, { userId });
export const setClassSupervisor = (classId: string, userId: string) =>
  put<void>(`/api/classes/${classId}/supervisor`, { userId });
export const enrollStudent = (classId: string, userId: string) =>
  post<void>(`/api/classes/${classId}/students`, { userId });

// ── Class profile + CRUD + schedule (spec 003) ──
export const getClassProfile = (classId: string) =>
  request<ClassProfile>(`/api/classes/${classId}`);
export const updateClass = (
  classId: string,
  input: { name: string; description?: string },
) => patch<void>(`/api/classes/${classId}`, input);
export const deleteClass = (classId: string) =>
  del<void>(`/api/classes/${classId}`);
export const setClassSchedule = (classId: string, slots: ScheduleSlot[]) =>
  put<void>(`/api/classes/${classId}/schedule`, {
    slots: slots.map(({ dayOfWeek, start, end }) => ({ dayOfWeek, start, end })),
  });
export const removeClassTeacher = (classId: string, teacherId: string) =>
  del<void>(`/api/classes/${classId}/teachers/${teacherId}`);
export const removeClassStudent = (classId: string, studentId: string) =>
  del<void>(`/api/classes/${classId}/students/${studentId}`);
export const listUnassignedStudents = (instituteId: string) =>
  request<User[]>(`/api/institutes/${instituteId}/unassigned-students`);

// ── Statistics (spec 004) ──
export const getInstituteStats = (instituteId: string) =>
  request<InstituteStats>(`/api/institutes/${instituteId}/stats`);

// ── Quran recitation (spec 005) ──
export const listSurahs = () => request<Surah[]>('/api/quran/surahs');
export const getStudentRecitation = (studentId: string) =>
  request<StudentRecitation>(`/api/students/${studentId}/recitations`);
export const addRecitation = (studentId: string, input: AddRecitationInput) =>
  post<void>(`/api/students/${studentId}/recitations`, input);
export const getClassRecitation = (classId: string) =>
  request<ClassRecitation>(`/api/classes/${classId}/recitations`);

// ── Attendance (الحضور) — spec 007 ──
export const getClassAttendance = (classId: string) =>
  request<ClassAttendance>(`/api/classes/${classId}/attendance`);
export const getSessionAttendance = (classId: string, date: string) =>
  request<SessionDetail | null>(`/api/classes/${classId}/attendance/${date}`);
export const takeAttendance = (classId: string, input: TakeAttendanceInput) =>
  post<void>(`/api/classes/${classId}/attendance`, input);
export const getStudentAttendance = (studentId: string) =>
  request<StudentAttendance>(`/api/students/${studentId}/attendance`);

// ── Teacher profile (spec 002) ──
const inst = (id: string) => `/api/institutes/${id}`;
export const getTeacherProfile = (instituteId: string, teacherId: string) =>
  request<TeacherProfile>(`${inst(instituteId)}/teachers/${teacherId}`);
export const updateTeacherBasic = (
  instituteId: string,
  teacherId: string,
  input: BasicInfoInput,
) => patch<void>(`${inst(instituteId)}/teachers/${teacherId}`, input);
export const updateTeacherDetails = (
  instituteId: string,
  teacherId: string,
  input: TeacherDetails,
) => patch<void>(`${inst(instituteId)}/teachers/${teacherId}/details`, input);
export const addCertification = (
  instituteId: string,
  teacherId: string,
  title: string,
) =>
  post<Certification>(`${inst(instituteId)}/teachers/${teacherId}/certifications`, {
    title,
  });
export const removeCertification = (instituteId: string, certId: string) =>
  del<void>(`${inst(instituteId)}/certifications/${certId}`);

// ── Student profile (spec 002) ──
export const getStudentProfile = (instituteId: string, studentId: string) =>
  request<StudentProfile>(`${inst(instituteId)}/students/${studentId}`);
export const updateStudent = (
  instituteId: string,
  studentId: string,
  input: BasicInfoInput,
) => patch<void>(`${inst(instituteId)}/students/${studentId}`, input);
export const changeStudentClass = (
  instituteId: string,
  studentId: string,
  classId: string | null,
) => put<void>(`${inst(instituteId)}/students/${studentId}/class`, { classId });

// ── Student notes (spec 002) ──
export const listNotes = (instituteId: string, studentId: string) =>
  request<StudentNote[]>(`${inst(instituteId)}/students/${studentId}/notes`);
export const addNote = (instituteId: string, studentId: string, body: string) =>
  post<StudentNote>(`${inst(instituteId)}/students/${studentId}/notes`, { body });
export const updateNote = (instituteId: string, noteId: string, body: string) =>
  patch<StudentNote>(`${inst(instituteId)}/notes/${noteId}`, { body });
export const deleteNote = (instituteId: string, noteId: string) =>
  del<void>(`${inst(instituteId)}/notes/${noteId}`);

// ── Delete member (spec 002) ──
export const deleteMember = (instituteId: string, memberId: string) =>
  del<void>(`${inst(instituteId)}/members/${memberId}`);

// ── Lessons program (الدروس) — spec 008 ──
export const listLessonCategories = (instituteId: string) =>
  request<LessonCategory[]>(`/api/institutes/${instituteId}/lesson-categories`);
export const createLessonCategory = (
  instituteId: string,
  input: { name: string; color: string },
) => post<LessonCategory>(`/api/institutes/${instituteId}/lesson-categories`, input);
export const updateLessonCategory = (
  categoryId: string,
  input: { name: string; color: string },
) => patch<void>(`/api/lesson-categories/${categoryId}`, input);
export const deleteLessonCategory = (categoryId: string) =>
  del<void>(`/api/lesson-categories/${categoryId}`);

export const createLesson = (instituteId: string, input: CreateLessonInput) =>
  post<{ lessonId: string }>(`/api/institutes/${instituteId}/lessons`, input);
export const updateLesson = (lessonId: string, input: UpdateLessonInput) =>
  patch<void>(`/api/lessons/${lessonId}`, input);
export const deleteLesson = (lessonId: string) => del<void>(`/api/lessons/${lessonId}`);
export const removeLessonClass = (lessonClassId: string) =>
  del<void>(`/api/lesson-classes/${lessonClassId}`);
export const reorderClassDay = (
  classId: string,
  input: { date: string; orderedLessonClassIds: string[] },
) => put<void>(`/api/classes/${classId}/lessons/order`, input);

export const getClassLessons = (classId: string, from?: string, to?: string) => {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  const qs = q.toString();
  return request<ClassProgram>(`/api/classes/${classId}/lessons${qs ? `?${qs}` : ''}`);
};
export const getStudentClassLessons = (classId: string) =>
  request<{ entries: StudentLessonEntry[] }>(`/api/classes/${classId}/lessons/student`);
export const getMyLessons = () =>
  request<{ entries: TeacherLessonEntry[] }>(`/api/lessons/mine`);

export const setClassLessonsVisibility = (classId: string, visible: boolean) =>
  put<void>(`/api/classes/${classId}/lessons-visibility`, { visible });
