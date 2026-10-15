import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const { VITE_API_URL } = loadEnv(mode, process.cwd(), 'VITE_');
    if (VITE_API_URL !== 'https://nextvn.onrender.com/api') {
      throw new Error('Production build requires VITE_API_URL=https://nextvn.onrender.com/api');
    }
  }

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    test: {
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'],
    },
  };
});
