import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:8787',
      '/students': 'http://localhost:8787',
      '/attendance': 'http://localhost:8787',
      '/timetable': 'http://localhost:8787',
      '/exams': 'http://localhost:8787',
      '/fees': 'http://localhost:8787',
      '/comms': 'http://localhost:8787',
      '/dashboard': 'http://localhost:8787',
      '/subjects': 'http://localhost:8787',
      '/users': 'http://localhost:8787',
      '/academic-years': 'http://localhost:8787',
      '/programs': 'http://localhost:8787',
      '/sections': 'http://localhost:8787',
      '/guardians': 'http://localhost:8787',
      '/teachers': 'http://localhost:8787',
      '/teacher-assignments': 'http://localhost:8787',
      '/enrollments': 'http://localhost:8787',
      '/institutions': 'http://localhost:8787',
      '/api': 'http://localhost:8787'
    }
  }
})
