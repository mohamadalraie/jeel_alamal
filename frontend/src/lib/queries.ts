'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

/** Centralised query keys (spec 006) so mutations can invalidate precisely. */
export const qk = {
  institutes: ['institutes'] as const,
  stats: (id: string) => ['stats', id] as const,
  teachers: (id: string) => ['teachers', id] as const,
  students: (id: string) => ['students', id] as const,
  managers: (id: string) => ['managers', id] as const,
  classes: (id: string) => ['classes', id] as const,
  unassignedStudents: (id: string) => ['unassigned-students', id] as const,
  classProfile: (id: string) => ['class-profile', id] as const,
  teacherProfile: (inst: string, id: string) => ['teacher-profile', inst, id] as const,
  studentProfile: (inst: string, id: string) => ['student-profile', inst, id] as const,
  studentRecitation: (id: string) => ['student-recitation', id] as const,
  classRecitation: (id: string) => ['class-recitation', id] as const,
  surahs: ['surahs'] as const,
  classAttendance: (id: string) => ['class-attendance', id] as const,
  studentAttendance: (id: string) => ['student-attendance', id] as const,
};

export const useInstitutes = () =>
  useQuery({ queryKey: qk.institutes, queryFn: api.listInstitutes });

export const useStats = (instituteId?: string) =>
  useQuery({
    queryKey: qk.stats(instituteId ?? ''),
    queryFn: () => api.getInstituteStats(instituteId!),
    enabled: !!instituteId,
  });

export const useTeachers = (instituteId?: string) =>
  useQuery({
    queryKey: qk.teachers(instituteId ?? ''),
    queryFn: () => api.listTeachers(instituteId!),
    enabled: !!instituteId,
  });

export const useStudents = (instituteId?: string) =>
  useQuery({
    queryKey: qk.students(instituteId ?? ''),
    queryFn: () => api.listStudents(instituteId!),
    enabled: !!instituteId,
  });

export const useManagers = (instituteId?: string) =>
  useQuery({
    queryKey: qk.managers(instituteId ?? ''),
    queryFn: () => api.listManagers(instituteId!),
    enabled: !!instituteId,
  });

export const useClasses = (instituteId?: string) =>
  useQuery({
    queryKey: qk.classes(instituteId ?? ''),
    queryFn: () => api.listClasses(instituteId!),
    enabled: !!instituteId,
  });

export const useUnassignedStudents = (instituteId?: string) =>
  useQuery({
    queryKey: qk.unassignedStudents(instituteId ?? ''),
    queryFn: () => api.listUnassignedStudents(instituteId!),
    enabled: !!instituteId,
  });

export const useClassProfile = (classId: string) =>
  useQuery({ queryKey: qk.classProfile(classId), queryFn: () => api.getClassProfile(classId), enabled: !!classId });

export const useTeacherProfile = (instituteId: string, teacherId: string) =>
  useQuery({
    queryKey: qk.teacherProfile(instituteId, teacherId),
    queryFn: () => api.getTeacherProfile(instituteId, teacherId),
    enabled: !!instituteId,
  });

export const useStudentProfile = (instituteId: string, studentId: string) =>
  useQuery({
    queryKey: qk.studentProfile(instituteId, studentId),
    queryFn: () => api.getStudentProfile(instituteId, studentId),
    enabled: !!instituteId,
  });

export const useStudentRecitation = (studentId?: string) =>
  useQuery({
    queryKey: qk.studentRecitation(studentId ?? ''),
    queryFn: () => api.getStudentRecitation(studentId!),
    enabled: !!studentId,
  });

export const useClassRecitation = (classId: string) =>
  useQuery({
    queryKey: qk.classRecitation(classId),
    queryFn: () => api.getClassRecitation(classId),
  });

export const useSurahs = () =>
  useQuery({ queryKey: qk.surahs, queryFn: api.listSurahs, staleTime: Infinity });

export const useClassAttendance = (classId: string) =>
  useQuery({
    queryKey: qk.classAttendance(classId),
    queryFn: () => api.getClassAttendance(classId),
    enabled: !!classId,
  });

export const useStudentAttendance = (studentId?: string) =>
  useQuery({
    queryKey: qk.studentAttendance(studentId ?? ''),
    queryFn: () => api.getStudentAttendance(studentId!),
    enabled: !!studentId,
  });

export { useQueryClient };
