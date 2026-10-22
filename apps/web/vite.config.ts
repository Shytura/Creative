import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DAY = 24 * 60 * 60;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Mnemo – Kunst- & Reisegedächtnis',
        short_name: 'Mnemo',
        description: 'Dein persönliches Gedächtnis für Kunst, Museen und Reisen.',
        lang: 'de',
        start_url: '/',
        display: 'standalone',
        theme_color: '#f3eee5',
        background_color: '#f3eee5',
        categories: ['lifestyle', 'travel', 'education'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 4000, maxAgeSeconds: 30 * DAY },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'remote-images',
              expiration: { maxEntries: 1000, maxAgeSeconds: 90 * DAY },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  worker: { format: 'es' },
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1600 },
});
