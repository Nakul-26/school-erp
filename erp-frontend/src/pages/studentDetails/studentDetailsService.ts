import { api, authFetch } from '../../services/api';

export const studentDetailsService = {
  getStudent: async (id: string) => await api.get(`/students/${id}`),
  getGuardians: async (id: string) => await api.get(`/guardians/student/${id}`),
  getEnrollments: async (id: string) => await api.get(`/enrollments/student/${id}`),
  getAcademicYears: async () => await api.get('/academic-years'),
  getPrograms: async () => await api.get('/programs'),
  getSections: async () => await api.get('/sections'),
  getAttendance: async (id: string) => await api.get(`/attendance/student/${id}`).catch(() => null),
  getLedger: async (id: string) => await api.get(`/fees/ledger/${id}`).catch(() => []),
  getPayments: async (id: string) => await api.get(`/fees/payments?student_id=${id}`).catch(() => []),
  getDocuments: async (id: string) => await api.get(`/students/${id}/documents`).catch(() => []),
  getNotes: async (id: string) => await api.get(`/students/${id}/notes`).catch(() => []),
  getTransportRoutes: async () => await api.get('/transport/routes').catch(() => []),
  getTransportAllocations: async () => await api.get('/transport/allocations').catch(() => []),
  getInstitution: async (institutionId: string) => await api.get(`/institutions/${institutionId}`),

  getStudentExamResults: async (id: string) => await api.get(`/exams/students/${id}/results`),
  getDetailedResult: async (id: string, examId: string) => await api.get(`/exams/students/${id}/exams/${examId}/result`),

  addNote: async (id: string, content: string) => await api.post(`/students/${id}/notes`, { content }),
  deleteNote: async (id: string, noteId: string) => await api.delete(`/students/${id}/notes/${noteId}`),

  createTransportAllocation: async (data: any) => await api.post('/transport/allocations', data),
  deleteTransportAllocation: async (id: string) => await api.delete(`/transport/allocations/${id}`),

  uploadDocument: async (id: string, formData: FormData) => await api.upload(`/students/${id}/documents/upload`, formData),
  downloadDocument: async (id: string, docId: string) => await authFetch(`/students/${id}/documents/${docId}/download`),
  deleteDocument: async (id: string, docId: string) => await api.delete(`/students/${id}/documents/${docId}`),

  updateStudent: async (id: string, data: any) => await api.put(`/students/${id}`, data),
};
