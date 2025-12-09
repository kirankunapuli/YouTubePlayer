import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
            console.log(`Scraping YouTube for: ${query}`);
            const ytsr = (await import('ytsr')).default;

            const filters1 = await ytsr.getFilters(query);
            const filter1 = filters1.get('Type').get('Video');

            if (!filter1.url) throw new Error('No video results found');

            const results = await ytsr(filter1.url, { limit: 20 });

            const items = results.items.map(item => ({
              url: item.url,
              type: 'video',
              title: item.title,
              thumbnail: item.bestThumbnail?.url,
              uploaderName: item.author?.name,
              duration: item.duration,
              uploaded: item.uploadedAt
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items })); // Piped usually returns {items: []}, let's return array or object?
            // App expecting items. data.items.
            // My previous code: res.end(JSON.stringify({ items }));
            // Let's stick to object { items }
          } catch (err) {
            console.error('YTSR Scraping failed:', err);
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
