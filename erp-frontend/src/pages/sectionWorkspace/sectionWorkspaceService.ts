import { api } from '../../services/api';
import type {
  Student, TimetableItem, Section, Institution, Teacher, Subject,
  TeachingAllocation, AttendanceSession, FeeRecord, Exam,
} from './sectionWorkspace.types';

export const sectionWorkspaceService = {
  getSection: async (id: string) => await api.get<Section>(`/sections/${id}`),
  getInstitution: async (institutionId: string) => await api.get<Institution>(`/institutions/${institutionId}`),
  getStudents: async (sectionId: string) => await api.get<Student[]>(`/students?section_id=${sectionId}`).catch(() => []),
  getWeeklyTimetable: async (sectionId: string) => await api.get<TimetableItem[]>(`/weekly-timetable?section_id=${sectionId}`).catch(() => []),
  getStudentAttendanceReport: async (sectionId: string) => await api.get<any[]>(`/attendance/reports/students?section_id=${sectionId}`).catch(() => []),
  getFeeRecords: async () => await api.get<FeeRecord[]>(`/fees/student-records`).catch(() => []),
  getExams: async () => await api.get<Exam[]>(`/exams`).catch(() => []),
  getTeachers: async () => await api.get<Teacher[]>(`/teachers`).catch(() => []),
  getSubjects: async () => await api.get<Subject[]>(`/subjects`).catch(() => []),
  getAttendanceSessions: async (sectionId: string) => await api.get<AttendanceSession[]>(`/attendance/sessions?section_id=${sectionId}`).catch(() => []),
  getTeachingAllocations: async (sectionId: string) => await api.get<TeachingAllocation[]>(`/teaching-allocations?section_id=${sectionId}`).catch(() => []),
  updateSection: async (id: string, data: any) => await api.put<Section>(`/sections/${id}`, data),
};
