import { api } from '../../services/api';

export const teacherDetailsService = {
  getTeacher: async (id: string) => await api.get(`/teachers/${id}`).catch(() => null),
  getAssignments: async (id: string) => await api.get(`/teaching-allocations?teacher_id=${id}`).catch(() => []),
  getAcademicYears: async () => await api.get('/academic-years').catch(() => []),
  getPrograms: async () => await api.get('/programs').catch(() => []),
  getSections: async () => await api.get('/sections').catch(() => []),
  getSubjects: async () => await api.get('/subjects').catch(() => []),
  getTimetableSlots: async () => await api.get('/timetable-slots').catch(() => []),
  getWeeklyTimetable: async (id: string) => await api.get(`/weekly-timetable?teacher_id=${id}`).catch(() => []),
  getWorkloadReport: async () => await api.get('/teachers/reports/workload').catch(() => []),
  getDepartments: async () => await api.get('/departments').catch(() => []),
  getInstitution: async (institutionId: string) => await api.get(`/institutions/${institutionId}`),

  getMyLeaveBalances: async (academicYearId: string) => await api.get(`/leave/balances/my?academic_year_id=${academicYearId}`).catch(() => []),
  getLeaveBalances: async (academicYearId: string) => await api.get(`/leave/balances?academic_year_id=${academicYearId}`).catch(() => []),
  getMyLeaveApplications: async () => await api.get('/leave/applications/my').catch(() => []),
  getLeaveApplicationsForTeacher: async (teacherId: string) => await api.get(`/leave/applications?teacher_id=${teacherId}`).catch(() => []),
  getSalaryStructure: async (teacherId: string) => await api.get(`/payroll/salary-structures/${teacherId}`).catch(() => null),
  getPayslips: async (teacherId: string) => await api.get(`/payroll/teacher/${teacherId}/payslips`).catch(() => []),
  getLeaveTypes: async () => await api.get('/leave/types').catch(() => []),

  getDocuments: async (teacherId: string) => await api.get(`/teachers/${teacherId}/documents`).catch(() => []),
  getNotes: async (teacherId: string) => await api.get(`/teachers/${teacherId}/notes`).catch(() => []),
  addNote: async (teacherId: string, content: string) => api.post(`/teachers/${teacherId}/notes`, { content }).catch(() => {}),
  downloadDocumentUrl: (teacherId: string, backendId: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}/teachers/${teacherId}/documents/${backendId}/download`;
  },
  deleteDocument: async (teacherId: string, backendId: string) => await api.delete(`/teachers/${teacherId}/documents/${backendId}`),
  uploadDocument: async (teacherId: string, formData: FormData) => await api.upload(`/teachers/${teacherId}/documents/upload`, formData),

  updateTeacher: async (id: string, data: any) => await api.put(`/teachers/${id}`, data),
  createUser: async (data: any) => await api.post('/users', data),
  applyLeave: async (data: any) => await api.post('/leave/applications', data),
};
