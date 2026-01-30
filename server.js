import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchSwarm } from './yt-swarm.js';
import fetch from 'node-fetch'; // Standard in Node 18, but explicit import if needed inside .mjs context or sticking to native globalThis
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiter to all routes
app.use(limiter);

// Simple allow-list for external image hosts the proxy is allowed to access.
// Adjust this list to match the domains your application legitimately uses.
const ALLOWED_IMAGE_HOSTS = [
    'i.ytimg.com',
    'img.youtube.com'
];

/**
 * Validate a user-provided URL for use with the image proxy to reduce SSRF risk.
 * - Only allow http/https schemes.
 * - Only allow hosts in ALLOWED_IMAGE_HOSTS.
 */
function validateImageProxyUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl);
    } catch (_e) {
        return null;
    }

    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
        return null;
    }

    // Normalize hostname: lowercase and strip any trailing dot.
    let hostname = url.hostname.toLowerCase();
    if (hostname.endsWith('.')) {
        hostname = hostname.slice(0, -1);
    }

    // Disallow obvious local hosts explicitly.
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('0.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') ||
        hostname.startsWith('192.168.') ||
        hostname.endsWith('.local')
    ) {
        return null;
    }

    // Only allow specific YouTube image domains (exact match after normalization)
    if (!ALLOWED_IMAGE_HOSTS.includes(hostname)) {
        return null;
    }

    // Return a canonical URL built from the validated host and original path/query.
    const safeUrl = new URL(url.toString());
    safeUrl.hostname = hostname;

    return safeUrl;
}

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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const imageRes = await fetch(validatedUrl.toString(), {
            redirect: 'error',
            signal: controller.signal
        });

        clearTimeout(timeout);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
        // Allow CORS for the frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(buffer);
    } catch (_) {
        console.error('[Server] Proxy failed:', _);
        res.status(500).send('Error fetching image');
    }
});

// Fallback to index.html for SPA routing
// Using app.use() without path avoids path-to-regexp parsing errors (e.g. "Missing parameter name at index 1")
app.use((req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`YoTP Neo Server running on port ${PORT}`);
});
