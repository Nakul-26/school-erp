import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:8787';

// Helper to bypass proxy and serve index.html for client-side routing on page refresh
const proxyConfig = () => ({
  target: BACKEND,
  bypass: (req: any) => {
    if (req.headers.accept?.includes('html')) {
      return '/index.html';
    }
  }
});

export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'static',
  },
  preview: {
    port: 3001,
  },
  server: {
    port: 3001,
    proxy: {
      // Core
      '/auth': proxyConfig(),
      '/dashboard': proxyConfig(),
      '/institutions': proxyConfig(),
      '/users': proxyConfig(),
      '/roles': proxyConfig(),
      '/audit-logs': proxyConfig(),
      '/system': proxyConfig(),
      '/system-settings': proxyConfig(),
      '/approvals': proxyConfig(),

      // People
      '/students': proxyConfig(),
      '/guardians': proxyConfig(),
      '/teachers': proxyConfig(),
      '/teacher-assignments': proxyConfig(),
      '/enrollments': proxyConfig(),
      '/alumni': proxyConfig(),
      '/visitors': proxyConfig(),

      // Admissions
      '/admissions': proxyConfig(),

      // Academics
      '/academic-years': proxyConfig(),
      '/academic-calendar': proxyConfig(),
      '/departments': proxyConfig(),
      '/programs': proxyConfig(),
      '/sections': proxyConfig(),
      '/subjects': proxyConfig(),
      '/teaching-allocations': proxyConfig(),
      '/timetable-slots': proxyConfig(),
      '/weekly-timetable': proxyConfig(),

      // Attendance
      '/attendance': proxyConfig(),
      '/teacher-attendance': proxyConfig(),

      // Exams & Grades
      '/exams': proxyConfig(),
      '/grades': proxyConfig(),

      // Homework
      '/homework': proxyConfig(),

      // Communication
      '/announcements': proxyConfig(),
      '/notifications': proxyConfig(),
      '/messaging': proxyConfig(),

      // Finance
      '/fees': proxyConfig(),
      '/payroll': proxyConfig(),

      // Leave
      '/leave': proxyConfig(),
      '/student-leaves': proxyConfig(),

      // Library, Transport, Assets
      '/library': proxyConfig(),
      '/transport': proxyConfig(),
      '/assets': proxyConfig(),

      // Legacy
      '/comms': proxyConfig(),
      '/api': proxyConfig(),
    }
  }
})
