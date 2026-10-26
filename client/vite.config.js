import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Dev: the browser calls /api/... on the Vite origin and Vite forwards it to the Express server,
// so no CORS is involved locally. Production: set VITE_API_BASE_URL to the deployed backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    css: false,
  },
});
