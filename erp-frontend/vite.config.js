import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const BACKEND = 'http://localhost:8787';
const proxyConfig = () => ({
    target: BACKEND,
    bypass: (req) => {
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
        port: 3000,
    },
    server: {
        port: 3000,
        proxy: {
            '/auth': proxyConfig(),
            '/dashboard': proxyConfig(),
            '/institutions': proxyConfig(),
            '/users': proxyConfig(),
            '/roles': proxyConfig(),
            '/audit-logs': proxyConfig(),
            '/system': proxyConfig(),
            '/system-settings': proxyConfig(),
            '/approvals': proxyConfig(),
            '/students': proxyConfig(),
            '/guardians': proxyConfig(),
            '/teachers': proxyConfig(),
            '/teacher-assignments': proxyConfig(),
            '/enrollments': proxyConfig(),
            '/alumni': proxyConfig(),
            '/visitors': proxyConfig(),
            '/admissions': proxyConfig(),
            '/academic-years': proxyConfig(),
            '/academic-calendar': proxyConfig(),
            '/departments': proxyConfig(),
            '/programs': proxyConfig(),
            '/sections': proxyConfig(),
            '/subjects': proxyConfig(),
            '/teaching-allocations': proxyConfig(),
            '/timetable-slots': proxyConfig(),
            '/weekly-timetable': proxyConfig(),
            '/attendance': proxyConfig(),
            '/teacher-attendance': proxyConfig(),
            '/exams': proxyConfig(),
            '/grades': proxyConfig(),
            '/homework': proxyConfig(),
            '/announcements': proxyConfig(),
            '/notifications': proxyConfig(),
            '/messaging': proxyConfig(),
            '/fees': proxyConfig(),
            '/payroll': proxyConfig(),
            '/leave': proxyConfig(),
            '/student-leaves': proxyConfig(),
            '/library': proxyConfig(),
            '/transport': proxyConfig(),
            '/assets': proxyConfig(),
            '/comms': proxyConfig(),
            '/api': proxyConfig()
        }
    }
});
//# sourceMappingURL=vite.config.js.map
