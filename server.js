import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchSwarm } from './yt-swarm.js';
import fetch from 'node-fetch'; // Standard in Node 18, but explicit import if needed inside .mjs context or sticking to native globalThis

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

    try {
        const imageRes = await fetch(targetUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
        // Allow CORS for the frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(buffer);
    } catch (e) {
        console.error('[Server] Proxy failed:', e);
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
