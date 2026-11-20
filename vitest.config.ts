import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The web app's "@/" import alias (see apps/web/tsconfig.json).
  resolve: { alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) } },
  test: {
    // Packages keep tests in test/; web code keeps them next to the source.
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    environment: 'node',
  },
});
