import { api } from '../../services/api';

export const admissionsService = {
  getInquiries: async () => await api.get('/admissions/inquiries'),
  getApplications: async () => await api.get('/admissions/applications'),
  getAcademicYears: async () => await api.get('/academic-years'),
  getPrograms: async () => await api.get('/programs'),

  createInquiry: async (data: any) => await api.post('/admissions/inquiries', data),
  convertInquiry: async (id: string, data: any) => await api.post(`/admissions/inquiries/${id}/convert`, data),
  updateInquiryStatus: async (id: string, status: string) => await api.patch(`/admissions/inquiries/${id}`, { status }),

  createApplication: async (data: any) => await api.post('/admissions/applications', data),
  approveApplication: async (id: string) => await api.patch(`/admissions/applications/${id}/approve`, {}),
  rejectApplication: async (id: string, reason: string) => await api.patch(`/admissions/applications/${id}/reject`, { reason }),
};
