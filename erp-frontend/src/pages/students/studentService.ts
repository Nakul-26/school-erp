import { api } from '../../services/api';

export const studentService = {
  getAcademicYears: async () => {
    return await api.get('/academic-years');
  },
  
  getPrograms: async () => {
    return await api.get('/programs');
  },
  
  getSections: async () => {
    return await api.get('/sections');
  },
  
  getInstitution: async (institutionId: string) => {
    return await api.get(`/institutions/${institutionId}`);
  },
  
  getStudents: async (queryParams: string) => {
    return await api.get(`/students?${queryParams}`);
  },
  
  getStudentById: async (id: string) => {
    return await api.get(`/students/${id}`);
  },
  
  createStudent: async (studentData: any) => {
    return await api.post('/students', studentData);
  },
  
  updateStudent: async (id: string, studentData: any) => {
    return await api.put(`/students/${id}`, studentData);
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
