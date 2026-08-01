import { api } from '../../services/api';
import type { Student, StudentsListResponse, AcademicYear, Program, Section, Institution } from './student.types';

export const studentService = {
  getAcademicYears: async () => {
    return await api.get<AcademicYear[]>('/academic-years');
  },

  getPrograms: async () => {
    return await api.get<Program[]>('/programs');
  },

  getSections: async () => {
    return await api.get<Section[]>('/sections');
  },

  getInstitution: async (institutionId: string) => {
    return await api.get<Institution>(`/institutions/${institutionId}`);
  },

  getStudents: async (queryParams: string) => {
    return await api.get<StudentsListResponse>(`/students?${queryParams}`);
  },

  getStudentById: async (id: string) => {
    return await api.get<Student>(`/students/${id}`);
  },

  createStudent: async (studentData: any) => {
    return await api.post<Student>('/students', studentData);
  },

  updateStudent: async (id: string, studentData: any) => {
    return await api.put<Student>(`/students/${id}`, studentData);
  },

  deleteStudent: async (id: string) => {
    return await api.delete(`/students/${id}`);
  },

  archiveStudent: async (id: string) => {
    return await api.post(`/students/${id}/archive`, {});
  },

  reactivateStudent: async (id: string) => {
    return await api.post(`/students/${id}/reactivate`, {});
  },

  bulkAction: async (studentIds: string[], action: string, payload?: any) => {
    return await api.post('/students/bulk-action', {
      student_ids: studentIds,
      action,
      payload
    });
  }
};
