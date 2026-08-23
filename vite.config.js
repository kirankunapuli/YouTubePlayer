import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'preview.png'],
      manifest: {
        name: 'YoTP Neo — Watch YouTube Videos Online at Work & School',
        short_name: 'YoTP Neo',
        description:
          'Free private YouTube player that works when YouTube is blocked at office, school or corporate networks. Proxy streaming, no ads, no tracking.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/proxy-image\?url=.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'yotp-thumbnails',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 30 },
            },
          },
          {
            urlPattern: /\/api\/search\?q=.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'yotp-search',
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'yotp-thumbnails-ext',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
