import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { searchSwarm } from './yt-swarm.js'
import youtubedl from 'youtube-dl-exec'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'yotp-backend',
      configureServer(server) {
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

            try {
              // Use native fetch (Node 18+)
              const imageRes = await fetch(targetUrl);
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
                format: 'best'
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
