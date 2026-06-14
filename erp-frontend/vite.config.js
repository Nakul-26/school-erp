import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
            '/api': 'http://localhost:8787'
        }
    }
});
//# sourceMappingURL=vite.config.js.map