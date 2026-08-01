import { api } from '../../services/api';
import type {
  Company, CreateCompanyInput, PlacementDrive, CreateDriveInput, UpdateDriveInput,
  PlacementApplication, UpdateApplicationInput,
} from './placements.types';

export const placementsService = {
  getCompanies: async () => await api.get<Company[]>('/placements/companies').catch(() => []),
  createCompany: async (data: CreateCompanyInput) => await api.post<{ id: string }>('/placements/companies', data),
  updateCompany: async (id: string, data: Partial<CreateCompanyInput>) => await api.put(`/placements/companies/${id}`, data),
  deleteCompany: async (id: string) => await api.delete(`/placements/companies/${id}`),

  getDrives: async (courseId?: string) => {
    const q = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return await api.get<PlacementDrive[]>(`/placements/drives${q}`).catch(() => []);
  },
  createDrive: async (data: CreateDriveInput) => await api.post<{ id: string }>('/placements/drives', data),
  updateDrive: async (id: string, data: UpdateDriveInput) => await api.put(`/placements/drives/${id}`, data),
  deleteDrive: async (id: string) => await api.delete(`/placements/drives/${id}`),

  getApplications: async (driveId: string) =>
    await api.get<PlacementApplication[]>(`/placements/drives/${driveId}/applications`).catch(() => []),
  updateApplication: async (id: string, data: UpdateApplicationInput) =>
    await api.patch(`/placements/applications/${id}`, data),
  withdrawApplication: async (id: string) => await api.delete(`/placements/applications/${id}`),

  getPrograms: async () => await api.get<any[]>('/programs').catch(() => []),
};
