import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const apiPort = process.env['API_PORT'] ?? '3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // MapLibre's worker is an ES module that imports a shared chunk.
  worker: { format: 'es' },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Same-origin API calls in dev, so no CORS setup is needed.
    proxy: { '/trpc': `http://127.0.0.1:${apiPort}` },
  },
});
