import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isElectronBuild = process.env.ELECTRON_BUILD === '1';
const DEFAULT_APP_URL = 'http://127.0.0.1:3001';

const PWA_ICONS = [
  {
    src: '/icons/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icons/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icons/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const envFromRoot = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const mergedEnv = { ...envFromRoot, ...env };
  const apiProxyTarget = mergedEnv.VITE_API_PROXY || mergedEnv.APP_URL || DEFAULT_APP_URL;

  const plugins = [react()];

  if (!isElectronBuild) {
    plugins.push(
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/apple-touch-icon.png',
          'splashes/*.png',
        ],
        manifest: {
          name: 'NovaPromo',
          short_name: 'NovaPromo',
          description: 'NovaPromo AutoPublisher — AI Marketing Assistant',
          start_url: '/?source=pwa',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#ff7a1a',
          background_color: '#050506',
          lang: 'it',
          categories: ['business', 'productivity', 'marketing'],
          icons: PWA_ICONS,
        },
        manifestFilename: 'manifest.webmanifest',
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/health/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'novapromo-fonts-stylesheets',
                expiration: {
                  maxEntries: 12,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'novapromo-fonts-webfonts',
                expiration: {
                  maxEntries: 24,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      })
    );
  }

  return {
    plugins,
    base: isElectronBuild ? './' : '/',
    envDir: __dirname,
    define: {
      'import.meta.env.VITE_RUNTIME': JSON.stringify(
        process.env.VITE_RUNTIME || (isElectronBuild ? 'desktop' : 'web')
      ),
      'import.meta.env.VITE_TIKTOK_ENABLED': JSON.stringify(process.env.VITE_TIKTOK_ENABLED || 'false'),
      'import.meta.env.VITE_DESKTOP_API_URL': JSON.stringify(
        process.env.VITE_DESKTOP_API_URL || (isElectronBuild ? 'http://localhost:3001' : '')
      ),
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
