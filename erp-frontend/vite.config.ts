import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Core
      '/auth': BACKEND,
      '/dashboard': BACKEND,
      '/institutions': BACKEND,
      '/users': BACKEND,
      '/roles': BACKEND,
      '/audit-logs': BACKEND,
      '/system': BACKEND,
      '/system-settings': BACKEND,
      '/approvals': BACKEND,

      // People
      '/students': BACKEND,
      '/guardians': BACKEND,
      '/teachers': BACKEND,
      '/teacher-assignments': BACKEND,
      '/enrollments': BACKEND,
      '/alumni': BACKEND,
      '/visitors': BACKEND,

      // Admissions
      '/admissions': BACKEND,

      // Academics
      '/academic-years': BACKEND,
      '/academic-calendar': BACKEND,
      '/departments': BACKEND,
      '/programs': BACKEND,
      '/sections': BACKEND,
      '/subjects': BACKEND,
      '/teaching-allocations': BACKEND,
      '/timetable-slots': BACKEND,
      '/weekly-timetable': BACKEND,

      // Attendance
      '/attendance': BACKEND,
      '/teacher-attendance': BACKEND,

      // Exams & Grades
      '/exams': BACKEND,
      '/grades': BACKEND,

      // Homework
      '/homework': BACKEND,

      // Communication
      '/announcements': BACKEND,
      '/notifications': BACKEND,
      '/messaging': BACKEND,

      // Finance
      '/fees': BACKEND,
      '/payroll': BACKEND,

      // Leave
      '/leave': BACKEND,
      '/student-leaves': BACKEND,

      // Library, Transport, Assets
      '/library': BACKEND,
      '/transport': BACKEND,
      '/assets': BACKEND,

      // Legacy
      '/comms': BACKEND,
      '/api': BACKEND,
    }
  }
})
