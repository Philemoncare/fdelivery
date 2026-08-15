import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Never let the browser cache dev modules — prevents stale-code errors
      // (e.g. "SuperAdminUsersPage is not defined") after edits/server restarts.
      headers: {
        'Cache-Control': 'no-store',
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3999',
          changeOrigin: true,
          ws: true,
        },
      },
      // HMR can be disabled with DISABLE_HMR for constrained development hosts.
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {
            // Stop watching files outside of the application source
            ignored: [
              '**/server.ts',
              '**/omnimarket-db.json',
              '**/scripts/**',
              '**/database/**',
              '**/node_modules/**',
              '**/.git/**',
              '**/dist/**'
            ],
          },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
