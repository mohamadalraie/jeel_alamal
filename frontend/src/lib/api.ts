import type {
  ClassItem,
  CreateInstituteInput,
  Institute,
  MemberInput,
  StudentInput,
  User,
} from './types';

/**
 * Typed API client. Auth travels via httpOnly cookies, so every request sends
 * `credentials: 'include'`. On a 401 the caller redirects to login.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

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

// ── Institute members ──
export const listTeachers = (instituteId: string) =>
  request<User[]>(`/api/institutes/${instituteId}/teachers`);
export const createTeacher = (instituteId: string, input: MemberInput) =>
  post<User>(`/api/institutes/${instituteId}/teachers`, input);
export const listStudents = (instituteId: string) =>
  request<User[]>(`/api/institutes/${instituteId}/students`);
export const createStudent = (instituteId: string, input: StudentInput) =>
  post<User>(`/api/institutes/${instituteId}/students`, input);

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
  request<void>(`/api/classes/${classId}/supervisor`, {
    method: 'PUT',
    body: JSON.stringify({ userId }),
  });
export const enrollStudent = (classId: string, userId: string) =>
  post<void>(`/api/classes/${classId}/students`, { userId });
