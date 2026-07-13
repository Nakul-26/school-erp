import { api } from '../../services/api';

export const teacherService = {
  getTeachers: async () => {
    return await api.get('/teachers');
  },

  getDepartments: async () => {
    return await api.get('/departments');
  },

  getPrograms: async () => {
    return await api.get('/programs');
  },

  getSubjects: async () => {
    return await api.get('/subjects');
  },

  getSections: async () => {
    return await api.get('/sections');
  },

  getAcademicYears: async () => {
    return await api.get('/academic-years');
  },

  createTeacher: async (teacherData: any) => {
    return await api.post('/teachers', teacherData);
  },

  updateTeacher: async (id: string, teacherData: any) => {
    return await api.put(`/teachers/${id}`, teacherData);
  },

  deleteTeacher: async (id: string) => {
    return await api.delete(`/teachers/${id}`);
  },

  createAssignment: async (assignmentData: any) => {
    return await api.post('/teacher-assignments', assignmentData);
  },

  getAssignmentsByTeacher: async (teacherId: string) => {
    return await api.get(`/teacher-assignments/teacher/${teacherId}`);
  },

  deleteAssignment: async (assignId: string) => {
    return await api.delete(`/teacher-assignments/${assignId}`);
  }
};
