import { api } from '../../services/api';

export const sectionWorkspaceService = {
  getSection: async (id: string) => await api.get(`/sections/${id}`),
  getInstitution: async (institutionId: string) => await api.get(`/institutions/${institutionId}`),
  getStudents: async (sectionId: string) => await api.get(`/students?section_id=${sectionId}`).catch(() => []),
  getWeeklyTimetable: async (sectionId: string) => await api.get(`/weekly-timetable?section_id=${sectionId}`).catch(() => []),
  getStudentAttendanceReport: async (sectionId: string) => await api.get(`/attendance/reports/students?section_id=${sectionId}`).catch(() => []),
  getFeeRecords: async () => await api.get(`/fees/student-records`).catch(() => []),
  getExams: async () => await api.get(`/exams`).catch(() => []),
  getTeachers: async () => await api.get(`/teachers`).catch(() => []),
  getSubjects: async () => await api.get(`/subjects`).catch(() => []),
  getAttendanceSessions: async (sectionId: string) => await api.get(`/attendance/sessions?section_id=${sectionId}`).catch(() => []),
  getTeachingAllocations: async (sectionId: string) => await api.get(`/teaching-allocations?section_id=${sectionId}`).catch(() => []),
  updateSection: async (id: string, data: any) => await api.put(`/sections/${id}`, data),
};
