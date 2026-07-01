import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { searchSwarm, runSwarmHealthCheck } from './yt-swarm.js'
import youtubedl from 'youtube-dl-exec'
import { validateImageProxyUrl } from './validate-image-url.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'preview.png'],
      manifest: {
        name: 'YoTP Neo — Private YouTube Player',
        short_name: 'YoTP Neo',
        description: 'Privacy-focused YouTube player with proxy mode',
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
    {
      name: 'yotp-backend',
      configureServer(server) {
        // Run swarm health check on dev start
        runSwarmHealthCheck().catch(() => {});

        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api')) {
            console.log('API Request:', req.url);
          }

          if (req.url.startsWith('/api/proxy-image')) {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const targetUrl = urlParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url');
              return;
            }

            const validated = validateImageProxyUrl(targetUrl);
            if (!validated) {
              res.statusCode = 400;
              res.end('Invalid or disallowed url');
              return;
            }

            try {
              const imageRes = await fetch(validated.toString(), {
                redirect: 'error',
                signal: AbortSignal.timeout(5000),
              });
              const arrayBuffer = await imageRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(buffer);
            } catch (e) {
              console.error('Proxy Image Error:', e);
              res.statusCode = 500;
              res.end('Error fetching image');
            }
            return;
          }

          if (req.url.startsWith('/api/stream')) {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const videoId = urlParams.get('id');
            const format = urlParams.get('format') || 'best';
            if (!videoId) {
              res.statusCode = 400;
              res.end('Missing video ID');
              return;
            }

            try {
              const raw = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
                dumpJson: true,
                noWarnings: true,
                noCallHome: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
                format,
              });

              if (raw && raw.url) {
                res.statusCode = 302;
                res.setHeader('Location', raw.url);
                res.end();
              } else {
                res.statusCode = 404;
                res.end('No playable format found');
              }
            } catch (err) {
              console.error('Video stream resolve failed:', err.message);
              res.statusCode = 500;
              res.end('Failed to resolve video stream');
            }
            return;
          }

          if (!req.url.startsWith('/api/search')) {
            next();
            return;
          }

          const urlParams = new URLSearchParams(req.url.split('?')[1]);
          const query = urlParams.get('q');

          if (!query) {
            res.end(JSON.stringify({ items: [] }));
            return;
          }

          try {
            const items = await searchSwarm(query);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items }));
          } catch (err) {
            console.error('Swarm search failed:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ],
  server: {
    // defaults
  }
})
