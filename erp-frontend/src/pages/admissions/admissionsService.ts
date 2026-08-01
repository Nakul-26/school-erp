import { api } from '../../services/api';
import type { Inquiry, Application, AcademicYear, Program, ApproveApplicationResult } from './admissions.types';

export const admissionsService = {
  getInquiries: async () => await api.get<Inquiry[]>('/admissions/inquiries'),
  getApplications: async () => await api.get<Application[]>('/admissions/applications'),
  getAcademicYears: async () => await api.get<AcademicYear[]>('/academic-years'),
  getPrograms: async () => await api.get<Program[]>('/programs'),

  createInquiry: async (data: any) => await api.post<Inquiry>('/admissions/inquiries', data),
  convertInquiry: async (id: string, data: any) => await api.post(`/admissions/inquiries/${id}/convert`, data),
  updateInquiryStatus: async (id: string, status: string) => await api.patch<Inquiry>(`/admissions/inquiries/${id}`, { status }),

  createApplication: async (data: any) => await api.post<Application>('/admissions/applications', data),
  approveApplication: async (id: string) => await api.patch<ApproveApplicationResult>(`/admissions/applications/${id}/approve`, {}),
  rejectApplication: async (id: string, reason: string) => await api.patch<Application>(`/admissions/applications/${id}/reject`, { reason }),
};
