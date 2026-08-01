import { api } from '../../services/api';
import type {
  Section, Program, Department, Teacher, Subject, AcademicYear, Institution,
  AuditLogsResponse, BulkActionResponse,
} from './classes.types';

export const classesService = {
  getSections: async (queryStr: string) => await api.get<Section[]>(`/sections?${queryStr}`),
  getAllSections: async () => await api.get<Section[]>('/sections').catch(() => []),
  getPrograms: async () => await api.get<Program[]>('/programs?include_archived=true'),
  getAcademicYears: async () => await api.get<AcademicYear[]>('/academic-years'),
  getTeachers: async () => await api.get<Teacher[]>('/teachers').catch(() => []),
  getDepartments: async () => await api.get<Department[]>('/departments').catch(() => []),
  getSubjects: async () => await api.get<Subject[]>('/subjects').catch(() => []),
  getInstitution: async (institutionId: string) => await api.get<Institution>(`/institutions/${institutionId}`),

  getSectionStudents: async (sectionId: string) => await api.get<any[]>(`/students?section_id=${sectionId}`).catch(() => []),
  getSectionTimetable: async (sectionId: string) => await api.get<any[]>(`/weekly-timetable?section_id=${sectionId}`).catch(() => []),
  getSectionAuditLogs: async (sectionId: string) => await api.get<AuditLogsResponse>(`/audit-logs?module=sections&record_id=${sectionId}`).catch(() => ({ data: [] })),

  createSection: async (data: any) => await api.post<Section>('/sections', data),
  updateSection: async (id: string, data: any) => await api.put<Section>(`/sections/${id}`, data),
  deleteSection: async (id: string) => await api.delete(`/sections/${id}`),
  bulkSectionAction: async (sectionIds: string[], action: string, payload?: any) =>
    await api.post<BulkActionResponse>('/sections/bulk-action', { section_ids: sectionIds, action, payload }),

  createProgram: async (data: any) => await api.post<Program>('/programs', data),
  updateProgram: async (id: string, data: any) => await api.put<Program>(`/programs/${id}`, data),
  archiveProgram: async (id: string) => await api.post(`/programs/${id}/archive`, {}),
  restoreProgram: async (id: string) => await api.post(`/programs/${id}/restore`, {}),
  deleteProgram: async (id: string) => await api.delete(`/programs/${id}?force=true`),
};
