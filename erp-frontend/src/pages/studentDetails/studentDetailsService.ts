import { api, authFetch } from '../../services/api';
import type {
  Student, Guardian, Enrollment, AcademicYear, Program, Section, Institution,
  AttendanceSummary, StudentFeeRecord, FeePayment, StudentDocument, StudentNote,
  TransportRoute, TransportAllocation, Exam, StudentExamResult, TranscriptResult,
  ElectiveOffering, StudentElectiveChoice, PlacementDriveInfo, PlacementEligibility, PlacementApplicationView,
  MedicalSummary,
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

  getTranscript: async (id: string, courseId: string) =>
    await api.get<TranscriptResult>(`/transcript/${id}?courseId=${encodeURIComponent(courseId)}`),

  getElectiveOfferings: async (courseId: string, academicYearId: string, semester: number, studentId: string) =>
    await api.get<ElectiveOffering[]>(
      `/electives/offerings/${courseId}?academicYearId=${encodeURIComponent(academicYearId)}&semester=${semester}&studentId=${encodeURIComponent(studentId)}`
    ),
  getMyElectives: async (studentId: string, courseId: string) =>
    await api.get<StudentElectiveChoice[]>(`/electives/my/${studentId}?courseId=${encodeURIComponent(courseId)}`),
  registerElective: async (data: { student_id: string; course_id: string; academic_year_id: string; semester: number; subject_id: string }) =>
    await api.post<{ id: string }>('/electives', data),
  withdrawElective: async (electiveId: string) => await api.delete(`/electives/${electiveId}`),

  getOpenDrives: async (courseId: string) =>
    await api.get<PlacementDriveInfo[]>(`/placements/drives?courseId=${encodeURIComponent(courseId)}`).catch(() => []),
  getDriveEligibility: async (driveId: string, studentId: string) =>
    await api.get<PlacementEligibility>(`/placements/drives/${driveId}/eligibility?studentId=${encodeURIComponent(studentId)}`),
  applyToDrive: async (driveId: string) => await api.post<{ id: string }>(`/placements/drives/${driveId}/apply`, {}),
  getMyApplications: async (studentId: string) =>
    await api.get<PlacementApplicationView[]>(`/placements/my/${studentId}`).catch(() => []),
  withdrawApplication: async (applicationId: string) => await api.delete(`/placements/applications/${applicationId}`),

  getMedicalSummary: async (studentId: string) => await api.get<MedicalSummary>(`/medical/${studentId}/summary`),
  addHealthVisit: async (studentId: string, data: { visit_date?: string | undefined; reason: string; diagnosis?: string | undefined; treatment?: string | undefined; referred_to?: string | undefined; follow_up_date?: string | undefined }) =>
    await api.post<{ id: string }>(`/medical/${studentId}/visits`, data),
  deleteHealthVisit: async (visitId: string) => await api.delete(`/medical/visits/${visitId}`),
  addImmunization: async (studentId: string, data: { vaccine_name: string; dose_number?: number | undefined; administered_date?: string | undefined; next_due_date?: string | undefined }) =>
    await api.post<{ id: string }>(`/medical/${studentId}/immunizations`, data),
  deleteImmunization: async (immunizationId: string) => await api.delete(`/medical/immunizations/${immunizationId}`),
  addHealthIncident: async (studentId: string, data: { incident_date?: string | undefined; incident_type?: string | undefined; description: string; severity?: string | undefined; action_taken?: string | undefined; parent_notified?: boolean | undefined }) =>
    await api.post<{ id: string }>(`/medical/${studentId}/incidents`, data),
  deleteHealthIncident: async (incidentId: string) => await api.delete(`/medical/incidents/${incidentId}`),

  addNote: async (id: string, content: string) => await api.post<StudentNote>(`/students/${id}/notes`, { content }),
  deleteNote: async (id: string, noteId: string) => await api.delete(`/students/${id}/notes/${noteId}`),

  createTransportAllocation: async (data: any) => await api.post<TransportAllocation>('/transport/allocations', data),
  deleteTransportAllocation: async (id: string) => await api.delete(`/transport/allocations/${id}`),

  uploadDocument: async (id: string, formData: FormData) => await api.upload<StudentDocument>(`/students/${id}/documents/upload`, formData),
  downloadDocument: async (id: string, docId: string) => await authFetch(`/students/${id}/documents/${docId}/download`),
  deleteDocument: async (id: string, docId: string) => await api.delete(`/students/${id}/documents/${docId}`),

  updateStudent: async (id: string, data: any) => await api.put<Student>(`/students/${id}`, data),
};
