import { api } from '../../services/api';
import type {
  Teacher, TeachingAssignment, AcademicYear, Program, Section, Subject, Department, Institution,
  TimetableSlot, WeeklyTimetableEntry, LeaveBalance, LeaveApplication, SalaryStructure, Payslip,
  LeaveType, TeacherDocument, TeacherNote, CreateUserResponse,
} from './teacherDetails.types';

export const teacherDetailsService = {
  getTeacher: async (id: string) => await api.get<Teacher>(`/teachers/${id}`).catch(() => null),
  getAssignments: async (id: string) => await api.get<TeachingAssignment[]>(`/teaching-allocations?teacher_id=${id}`).catch(() => []),
  getAcademicYears: async () => await api.get<AcademicYear[]>('/academic-years').catch(() => []),
  getPrograms: async () => await api.get<Program[]>('/programs').catch(() => []),
  getSections: async () => await api.get<Section[]>('/sections').catch(() => []),
  getSubjects: async () => await api.get<Subject[]>('/subjects').catch(() => []),
  getTimetableSlots: async () => await api.get<TimetableSlot[]>('/timetable-slots').catch(() => []),
  getWeeklyTimetable: async (id: string) => await api.get<WeeklyTimetableEntry[]>(`/weekly-timetable?teacher_id=${id}`).catch(() => []),
  getWorkloadReport: async () => await api.get<any[]>('/teachers/reports/workload').catch(() => []),
  getDepartments: async () => await api.get<Department[]>('/departments').catch(() => []),
  getInstitution: async (institutionId: string) => await api.get<Institution>(`/institutions/${institutionId}`),

  getMyLeaveBalances: async (academicYearId: string) => await api.get<LeaveBalance[]>(`/leave/balances/my?academic_year_id=${academicYearId}`).catch(() => []),
  getLeaveBalances: async (academicYearId: string) => await api.get<LeaveBalance[]>(`/leave/balances?academic_year_id=${academicYearId}`).catch(() => []),
  getMyLeaveApplications: async () => await api.get<LeaveApplication[]>('/leave/applications/my').catch(() => []),
  getLeaveApplicationsForTeacher: async (teacherId: string) => await api.get<LeaveApplication[]>(`/leave/applications?teacher_id=${teacherId}`).catch(() => []),
  getSalaryStructure: async (teacherId: string) => await api.get<SalaryStructure>(`/payroll/salary-structures/${teacherId}`).catch(() => null),
  getPayslips: async (teacherId: string) => await api.get<Payslip[]>(`/payroll/teacher/${teacherId}/payslips`).catch(() => []),
  getLeaveTypes: async () => await api.get<LeaveType[]>('/leave/types').catch(() => []),

  getDocuments: async (teacherId: string) => await api.get<TeacherDocument[]>(`/teachers/${teacherId}/documents`).catch(() => []),
  getNotes: async (teacherId: string) => await api.get<TeacherNote[]>(`/teachers/${teacherId}/notes`).catch(() => []),
  addNote: async (teacherId: string, content: string) => api.post<TeacherNote>(`/teachers/${teacherId}/notes`, { content }).catch(() => {}),
  downloadDocumentUrl: (teacherId: string, backendId: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}/teachers/${teacherId}/documents/${backendId}/download`;
  },
  deleteDocument: async (teacherId: string, backendId: string) => await api.delete(`/teachers/${teacherId}/documents/${backendId}`),
  uploadDocument: async (teacherId: string, formData: FormData) => await api.upload<TeacherDocument>(`/teachers/${teacherId}/documents/upload`, formData),

  updateTeacher: async (id: string, data: any) => await api.put<Teacher>(`/teachers/${id}`, data),
  createUser: async (data: any) => await api.post<CreateUserResponse>('/users', data),
  applyLeave: async (data: any) => await api.post<LeaveApplication>('/leave/applications', data),
};
