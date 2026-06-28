import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isElectronBuild = process.env.ELECTRON_BUILD === '1';
const DEFAULT_APP_URL = 'http://127.0.0.1:3001';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const envFromRoot = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const mergedEnv = { ...envFromRoot, ...env };
  const apiProxyTarget = mergedEnv.VITE_API_PROXY || mergedEnv.APP_URL || DEFAULT_APP_URL;

  return {
    plugins: [react()],
    base: isElectronBuild ? './' : '/',
    envDir: __dirname,
    define: {
      'import.meta.env.VITE_RUNTIME': JSON.stringify(
        process.env.VITE_RUNTIME || (isElectronBuild ? 'desktop' : 'web')
      ),
      'import.meta.env.VITE_TIKTOK_ENABLED': JSON.stringify(process.env.VITE_TIKTOK_ENABLED || 'false'),
      'import.meta.env.VITE_DESKTOP_API_URL': JSON.stringify(process.env.VITE_DESKTOP_API_URL || 'http://localhost:3001'),
      'import.meta.env.VITE_DEMO_MODE': JSON.stringify(mergedEnv.VITE_DEMO_MODE || 'false'),
    },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
