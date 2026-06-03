import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.API_PORT || '3001';
  const base = process.env.BASE_PATH || '/';

  return {
    base,
    root: '.',
    publicDir: 'public',
    optimizeDeps: {
      include: ['html2pdf.js'],
    },
    build: {
      outDir: 'dist',
      commonjsOptions: {
        include: [/html2pdf.js/, /node_modules/],
      },
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
