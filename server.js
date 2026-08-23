import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchSwarm, runSwarmHealthCheck, getSwarmStatus, startHealthCheckInterval } from './yt-swarm.js';
import rateLimit from 'express-rate-limit';
import youtubedl from 'youtube-dl-exec';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { validateImageProxyUrl } from './validate-image-url.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Behind Render/Heroku-style reverse proxies: trust the first proxy hop so
// express-rate-limit sees the real client IP instead of the proxy IP.
app.set('trust proxy', 1);

// Rate limiting — scoped to API routes only so static files and thumbnails
// never exhaust a user's quota while browsing.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many searches from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/search', searchLimiter);

/* ---- In-memory LRU cache for search results ---- */

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEARCH_CACHE_MAX = 100;

const searchCache = new Map(); // key -> { items, expiresAt }

function cacheKey(query) {
  return query.trim().toLowerCase();
}

function getCachedSearch(query) {
  const key = cacheKey(query);
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  // Refresh recency for LRU behavior
  searchCache.delete(key);
  searchCache.set(key, entry);
  return entry.items;
}

function setCachedSearch(query, items) {
  const key = cacheKey(query);
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    // Evict oldest (first inserted)
    const oldest = searchCache.keys().next().value;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { items, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
}

/* ---- Small TTL cache for yt-dlp resolved stream metadata ---- */

const STREAM_URL_TTL_MS = 10 * 60 * 1000; // resolved URLs are valid ~6h; 10 min is safe
const streamUrlCache = new Map(); // videoId -> { url, isHls, expiresAt }

/**
 * Resolve the best browser-playable stream for a video.
 *
 * YouTube reality (2026):
 *  - Progressive (single-file) URLs now require PO tokens and return 403 when
 *    fetched server-side. HLS manifest URLs are exempt.
 *  - Both VOD and live streams expose HLS variants (VOD HLS = full file,
 *    live HLS = growing playlist).
 *
 * Strategy: always resolve the best HLS variant and remux to fragmented MP4
 * via ffmpeg on the fly. Works identically for VOD and live.
 */
async function resolveStream(videoId) {
  const cached = streamUrlCache.get(videoId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const raw = await youtubedl(`https://www.youtube.com/watch?v=${videoId}`, {
    dumpJson: true,
    noWarnings: true,
    preferFreeFormats: true,
    // Always prefer HLS: progressive URLs now require PO tokens and 403 when
    // fetched server-side. HLS URLs are exempt.
    format: 'b[protocol=m3u8_native]/b[protocol=https]/b',
    // web_safari client serves PO-token-free URLs with HLS variants for both
    // VODs and live streams; other clients are fallbacks when Safari's is
    // throttled. Default clients gate progressive URLs behind PO tokens which
    // we cannot generate server-side.
    extractorArgs: 'youtube:player_client=web_safari,tv,web_music,mweb',
    // yt-dlp needs a JS runtime for YouTube extraction; without it the
    // resolved googlevideo URLs return 403.
    jsRuntimes: 'node',
  });
  if (raw?.url == null) {
    throw new Error('No playable format found');
  }

  const entry = {
    url: raw.url,
    isHls: raw.protocol === 'm3u8_native' || raw.url.includes('/manifest/hls_'),
    expiresAt: Date.now() + STREAM_URL_TTL_MS,
  };
  streamUrlCache.set(videoId, entry);
  return entry;
}

// Serve static files from the build directory
app.use(express.static(join(__dirname, 'dist')));

// Health endpoint for uptime monitors / Render health checks
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    swarm: getSwarmStatus(),
    timestamp: new Date().toISOString(),
  });
});

// API: Search
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== 'string') {
    return res.json({ items: [] });
  }

  const cached = getCachedSearch(query);
  if (cached) {
    return res.json({ items: cached, cached: true });
  }

  try {
    const items = await searchSwarm(query);
    setCachedSearch(query, items);
    res.json({ items });
  } catch (err) {
    console.error('[Server] Swarm search failed:', err.message);
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

// API: Stream Proxy — pipes media server-side with Range support so clients on
// restricted networks never need direct access to googlevideo.com.
const STREAM_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const FORWARD_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges'];

function buildUpstreamHeaders(rangeHeader) {
  return {
    ...(rangeHeader ? { Range: rangeHeader } : {}),
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  };
}

function pickUpstreamHeaders(upstream) {
  const headers = {};
  for (const h of FORWARD_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers[h] = v;
  }
  if (!headers['accept-ranges']) headers['accept-ranges'] = 'bytes';
  if (!headers['content-type']) headers['content-type'] = 'video/mp4';
  headers['cache-control'] = 'no-store';
  return headers;
}

async function pipeUpstream(req, res, upstreamUrl, rangeHeader) {
  const upstream = await fetch(upstreamUrl, {
    headers: buildUpstreamHeaders(rangeHeader),
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });

  if (!upstream.ok && upstream.status !== 206) {
    console.error('[Server] Upstream stream error:', upstream.status);
    res.status(502).send('Upstream stream error');
    return;
  }

  res.writeHead(upstream.status === 206 ? 206 : 200, pickUpstreamHeaders(upstream));

  if (!upstream.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(upstream.body);
  nodeStream.pipe(res);
  nodeStream.on('error', (err) => {
    console.error('[Server] Stream pipe error:', err.message);
    res.end();
  });
  req.on('close', () => {
    nodeStream.destroy();
  });
}

/**
 * Live streams resolve to HLS manifests which Chrome/Firefox cannot play
 * natively. Remux HLS -> fragmented MP4 on the fly with ffmpeg and pipe it.
 */
function pipeLiveStream(res, req, hlsUrl) {
  res.writeHead(200, {
    'content-type': 'video/mp4',
    'cache-control': 'no-store',
    'accept-ranges': 'none',
  });

  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const ffmpeg = spawn(
    ffmpegPath,
    [
      '-nostdin',
      '-i', hlsUrl,
      '-c', 'copy', // no re-encode — remux only, cheap on CPU
      // HLS carries AAC in ADTS frames; the MP4 muxer requires raw AAC.
      '-bsf:a', 'aac_adtstoasc',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      'pipe:1',
    ],
    { stdio: ['ignore', 'pipe', 'ignore'] },
  );

  ffmpeg.stdout.pipe(res);
  ffmpeg.on('error', (err) => {
    console.error('[Server] ffmpeg spawn failed:', err.message);
    if (!res.headersSent) res.status(502).send('Live streaming unavailable');
    else res.end();
  });
  req.on('close', () => {
    ffmpeg.kill('SIGKILL');
  });
}

app.get('/api/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId || typeof videoId !== 'string' || !STREAM_ID_RE.test(videoId)) {
    return res.status(400).send('Missing or invalid video ID');
  }

  let stream;
  try {
    stream = await resolveStream(videoId);
  } catch (err) {
    console.error('[Server] Video stream resolve failed:', err.message);
    return res.status(500).send('Failed to resolve video stream');
  }

  try {
    if (stream.isHls) {
      pipeLiveStream(res, req, stream.url);
    } else {
      await pipeUpstream(req, res, stream.url, req.headers.range);
    }
  } catch (err) {
    console.error('[Server] Stream proxy failed:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Stream proxy failed');
    } else {
      res.end();
    }
  }
});

// Fallback to index.html for SPA routing
app.use((_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`YoTP Neo Server running on port ${PORT}`);
  runSwarmHealthCheck().catch((err) =>
    console.error('[Server] Health check failed:', err.message)
  );
  startHealthCheckInterval();
});

// Graceful shutdown — finish in-flight responses before exiting
function shutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down gracefully…`);
  server.close(() => {
    console.log('[Server] Closed. Exiting.');
    process.exit(0);
  });
  // Force-exit if connections don't drain in time
  setTimeout(() => {
    console.error('[Server] Forced exit after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
