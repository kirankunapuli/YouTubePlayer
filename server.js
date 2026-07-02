import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchSwarm, runSwarmHealthCheck } from './yt-swarm.js';
import rateLimit from 'express-rate-limit';
import youtubedl from 'youtube-dl-exec';
import { validateImageProxyUrl } from './validate-image-url.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Serve static files from the build directory
app.use(express.static(join(__dirname, 'dist')));

// API: Search
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json({ items: [] });
  }

  try {
    const items = await searchSwarm(query);
    res.json({ items });
  } catch (err) {
    console.error('[Server] Swarm search failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// API: Image Proxy
app.get('/api/proxy-image', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url');
  }

  const validatedUrl = validateImageProxyUrl(targetUrl);
  if (!validatedUrl) {
    return res.status(400).send('Invalid or disallowed url');
  }

  try {
    const imageRes = await fetch(validatedUrl.toString(), {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });

    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (_) {
    console.error('[Server] Proxy failed:', _);
    res.status(500).send('Error fetching image');
  }
});

// API: Stream Proxy
app.get('/api/stream', async (req, res) => {
  const videoId = req.query.id;
  const format = req.query.format || 'best';
  if (!videoId) {
    return res.status(400).send('Missing video ID');
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
      res.redirect(raw.url);
    } else {
      res.status(404).send('No playable format found');
    }
  } catch (err) {
    console.error('[Server] Video stream resolve failed:', err.message);
    res.status(500).send('Failed to resolve video stream');
  }
});

// Fallback to index.html for SPA routing
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`YoTP Neo Server running on port ${PORT}`);
  runSwarmHealthCheck().catch((err) =>
    console.error('[Server] Health check failed:', err.message)
  );
});
