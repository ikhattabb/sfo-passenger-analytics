import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app lives in web/. Running `npm run build` writes the site to dist/.
// base './' lets the built site open from any folder or static host.
// The chart library is large, so it is split into its own file to keep the app code small.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
