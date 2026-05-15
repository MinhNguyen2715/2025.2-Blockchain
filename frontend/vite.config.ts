import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend (NestJS) sets CORS for http://localhost:5173 in backend/src/main.ts.
// Keep this port unless you also change the backend's FRONTEND_URL env var.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
