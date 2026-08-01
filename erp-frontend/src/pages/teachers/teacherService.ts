import { api } from '../../services/api';
import type { Teacher, Department, Program, Subject, Section, AcademicYear, TeacherAssignment, CreateTeacherResponse } from './teacher.types';

export const teacherService = {
  getTeachers: async () => {
    return await api.get<Teacher[]>('/teachers');
  },

  getDepartments: async () => {
    return await api.get<Department[]>('/departments');
  },

  getPrograms: async () => {
    return await api.get<Program[]>('/programs');
  },

  getSubjects: async () => {
    return await api.get<Subject[]>('/subjects');
  },

  getSections: async () => {
    return await api.get<Section[]>('/sections');
  },

  getAcademicYears: async () => {
    return await api.get<AcademicYear[]>('/academic-years');
  },

  createTeacher: async (teacherData: any) => {
    return await api.post<CreateTeacherResponse>('/teachers', teacherData);
  },

  updateTeacher: async (id: string, teacherData: any) => {
    return await api.put<Teacher>(`/teachers/${id}`, teacherData);
  },

  deleteTeacher: async (id: string) => {
    return await api.delete(`/teachers/${id}`);
  },

  createAssignment: async (assignmentData: any) => {
    return await api.post<TeacherAssignment>('/teacher-assignments', assignmentData);
  },

  getAssignmentsByTeacher: async (teacherId: string) => {
    return await api.get<TeacherAssignment[]>(`/teacher-assignments/teacher/${teacherId}`);
  },

  deleteAssignment: async (assignId: string) => {
    return await api.delete(`/teacher-assignments/${assignId}`);
  },

  bulkAction: async (teacherIds: string[], action: string, payload?: any) => {
    return await api.post('/teachers/bulk-action', {
      teacher_ids: teacherIds,
      action,
      payload
    });
  }
};
