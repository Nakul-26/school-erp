import { api, authFetch } from '../../services/api';
import type {
  Student, Guardian, Enrollment, AcademicYear, Program, Section, Institution,
  AttendanceSummary, StudentFeeRecord, FeePayment, StudentDocument, StudentNote,
  TransportRoute, TransportAllocation, Exam, StudentExamResult,
} from './studentDetails.types';

export const studentDetailsService = {
  getStudent: async (id: string) => await api.get<Student>(`/students/${id}`),
  getGuardians: async (id: string) => await api.get<Guardian[]>(`/guardians/student/${id}`),
  getEnrollments: async (id: string) => await api.get<Enrollment[]>(`/enrollments/student/${id}`),
  getAcademicYears: async () => await api.get<AcademicYear[]>('/academic-years'),
  getPrograms: async () => await api.get<Program[]>('/programs'),
  getSections: async () => await api.get<Section[]>('/sections'),
  getAttendance: async (id: string) => await api.get<AttendanceSummary>(`/attendance/student/${id}`).catch(() => null),
  getLedger: async (id: string) => await api.get<StudentFeeRecord[]>(`/fees/ledger/${id}`).catch(() => []),
  getPayments: async (id: string) => await api.get<FeePayment[]>(`/fees/payments?student_id=${id}`).catch(() => []),
  getDocuments: async (id: string) => await api.get<StudentDocument[]>(`/students/${id}/documents`).catch(() => []),
  getNotes: async (id: string) => await api.get<StudentNote[]>(`/students/${id}/notes`).catch(() => []),
  getTransportRoutes: async () => await api.get<TransportRoute[]>('/transport/routes').catch(() => []),
  getTransportAllocations: async () => await api.get<TransportAllocation[]>('/transport/allocations').catch(() => []),
  getInstitution: async (institutionId: string) => await api.get<Institution>(`/institutions/${institutionId}`),

  getStudentExamResults: async (id: string) => await api.get<Exam[]>(`/exams/students/${id}/results`),
  getDetailedResult: async (id: string, examId: string) => await api.get<StudentExamResult>(`/exams/students/${id}/exams/${examId}/result`),

  addNote: async (id: string, content: string) => await api.post<StudentNote>(`/students/${id}/notes`, { content }),
  deleteNote: async (id: string, noteId: string) => await api.delete(`/students/${id}/notes/${noteId}`),

  createTransportAllocation: async (data: any) => await api.post<TransportAllocation>('/transport/allocations', data),
  deleteTransportAllocation: async (id: string) => await api.delete(`/transport/allocations/${id}`),

  uploadDocument: async (id: string, formData: FormData) => await api.upload<StudentDocument>(`/students/${id}/documents/upload`, formData),
  downloadDocument: async (id: string, docId: string) => await authFetch(`/students/${id}/documents/${docId}/download`),
  deleteDocument: async (id: string, docId: string) => await api.delete(`/students/${id}/documents/${docId}`),

  updateStudent: async (id: string, data: any) => await api.put<Student>(`/students/${id}`, data),
};
