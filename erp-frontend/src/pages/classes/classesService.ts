import { api } from '../../services/api';

export const classesService = {
  getSections: async (queryStr: string) => await api.get(`/sections?${queryStr}`),
  getAllSections: async () => await api.get('/sections').catch(() => []),
  getPrograms: async () => await api.get('/programs?include_archived=true'),
  getAcademicYears: async () => await api.get('/academic-years'),
  getTeachers: async () => await api.get('/teachers').catch(() => []),
  getDepartments: async () => await api.get('/departments').catch(() => []),
  getSubjects: async () => await api.get('/subjects').catch(() => []),
  getInstitution: async (institutionId: string) => await api.get(`/institutions/${institutionId}`),

  getSectionStudents: async (sectionId: string) => await api.get(`/students?section_id=${sectionId}`).catch(() => []),
  getSectionTimetable: async (sectionId: string) => await api.get(`/weekly-timetable?section_id=${sectionId}`).catch(() => []),
  getSectionAuditLogs: async (sectionId: string) => await api.get(`/audit-logs?module=sections&record_id=${sectionId}`).catch(() => ({ data: [] })),

  createSection: async (data: any) => await api.post('/sections', data),
  updateSection: async (id: string, data: any) => await api.put(`/sections/${id}`, data),
  deleteSection: async (id: string) => await api.delete(`/sections/${id}`),
  bulkSectionAction: async (sectionIds: string[], action: string, payload?: any) =>
    await api.post('/sections/bulk-action', { section_ids: sectionIds, action, payload }),

  createProgram: async (data: any) => await api.post('/programs', data),
  updateProgram: async (id: string, data: any) => await api.put(`/programs/${id}`, data),
  archiveProgram: async (id: string) => await api.post(`/programs/${id}/archive`, {}),
  restoreProgram: async (id: string) => await api.post(`/programs/${id}/restore`, {}),
  deleteProgram: async (id: string) => await api.delete(`/programs/${id}?force=true`),
};
