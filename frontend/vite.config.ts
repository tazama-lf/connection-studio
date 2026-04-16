import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {


  const envFromFile = loadEnv(mode, process.cwd());
  const VITE_ALLOWED_HOSTS = process.env.VITE_ALLOWED_HOSTS ?? envFromFile.VITE_ALLOWED_HOSTS;

  let allowedHosts: true | string[];

  if (VITE_ALLOWED_HOSTS === 'all') {
    allowedHosts = true;
  } else if (VITE_ALLOWED_HOSTS) {
    allowedHosts = VITE_ALLOWED_HOSTS
      .split(',')
      .map((host) => host.trim());
  } else {
    allowedHosts = [];
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
      allowedHosts,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@common': path.resolve(__dirname, './src/common'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@features': path.resolve(__dirname, './src/features'),
        '@test': path.resolve(__dirname, './src/test'),
        '@assets': path.resolve(__dirname, './src/assets'),
      },
    },
  };
});