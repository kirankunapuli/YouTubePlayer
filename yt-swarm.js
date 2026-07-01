import YouTubeSr from 'youtube-sr';
import fetch from 'node-fetch';
import youtubedl from 'youtube-dl-exec';
const YouTube = YouTubeSr.default || YouTubeSr;

/** Standardize search results from various providers into a single format. */
function standardize(item, source) {
    if (source === 'youtube-sr') {
        return {
            url: item.url,
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail?.url,
            uploaderName: item.channel?.name,
            duration: item.duration_formatted,
            uploaded: item.uploadedAt,
        };
    }
    if (source === 'piped') {
        return {
            url: 'https://www.youtube.com/watch?v=' + (item.url.split('v=')[1] || item.url),
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail,
            uploaderName: item.uploaderName,
            duration: item.duration,
            uploaded: item.uploadedDate,
        };
    }
    if (source === 'invidious') {
        return {
            url: 'https://www.youtube.com/watch?v=' + item.videoId,
            type: 'video',
            title: item.title,
            thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            uploaderName: item.author,
            duration: item.duration,
            uploaded: item.publishedText,
        };
    }
    return item;
}

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://api.piped.mha.fi',
    'https://pipedapi.moomoo.me',
    'https://pipedapi.leptons.xyz',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.lunar.icu'
];

const INVIDIOUS_INSTANCES = [
    'https://yewtu.be',
    'https://invidious.tiekoetter.com',
    'https://inv.tux.rs',
    'https://invidious.nerdvpn.de',
    'https://iv.ggtyler.dev'
];

const HEALTH_CHECK_TIMEOUT = 5000;

/** Ping a single Piped instance to check if it responds. */
async function checkPipedInstance(baseUrl) {
    try {
        const res = await fetch(`${baseUrl}/health`, {
            signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
        });
        return res.ok ? baseUrl : null;
    } catch {
        return null;
    }
}

/** Ping a single Invidious instance to check if it responds. */
async function checkInvidiousInstance(baseUrl) {
    try {
        const res = await fetch(`${baseUrl}/api/v1/stats`, {
            signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
        });
        return res.ok ? baseUrl : null;
    } catch {
        return null;
    }
}

let healthyPiped = [...PIPED_INSTANCES];
let healthyInvidious = [...INVIDIOUS_INSTANCES];

/**
 * Run a one-time health check against all Piped and Invidious instances.
 */
export async function runSwarmHealthCheck() {
    console.log('[Swarm] Running health check…');

    const [pipedResults, invidiousResults] = await Promise.all([
        Promise.all(PIPED_INSTANCES.map(async (url) => {
            const ok = await checkPipedInstance(url);
            if (!ok) console.warn(`[Swarm]   ❌ Piped down: ${url}`);
            else console.log(`[Swarm]   ✅ Piped ok: ${url}`);
            return ok;
        })),
        Promise.all(INVIDIOUS_INSTANCES.map(async (url) => {
            const ok = await checkInvidiousInstance(url);
            if (!ok) console.warn(`[Swarm]   ❌ Invidious down: ${url}`);
            else console.log(`[Swarm]   ✅ Invidious ok: ${url}`);
            return ok;
        })),
    ]);

    healthyPiped = pipedResults.filter(Boolean);
    healthyInvidious = invidiousResults.filter(Boolean);

    console.log(`[Swarm] Health check done. ${healthyPiped.length}/${PIPED_INSTANCES.length} Piped, ${healthyInvidious.length}/${INVIDIOUS_INSTANCES.length} Invidious instances healthy.`);

    if (healthyPiped.length === 0 && healthyInvidious.length === 0) {
        console.warn('[Swarm] ⚠ All instances down — searches will rely on youtube-sr scraper only.');
    }
}

/**
 * Ultimate fallback: use yt-dlp (youtube-dl-exec) to search YouTube directly.
 * Bypasses CAPTCHA and third-party API filtering.
 * yt-dlp is already installed as a dependency.
 */
async function searchWithYtDlp(query) {
    // Use exec() to get raw { stdout, stderr, exitCode } — the main fn() would
    // try to JSON.parse the NDJSON output and fail on multiple lines.
    const { stdout, exitCode } = await youtubedl.exec(
        `ytsearch20:${query}`,
        { dumpJson: true, flatPlaylist: true, noWarnings: true, noCallHome: true, preferFreeFormats: true },
    );
    if (exitCode !== 0) throw new Error('yt-dlp exited with code ' + exitCode);
    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
        const item = JSON.parse(line);
        return {
            url: item.url || `https://www.youtube.com/watch?v=${item.id}`,
            type: 'video',
            title: item.title || '',
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            uploaderName: item.channel || item.uploader || '',
            duration: item.duration ? String(item.duration) : '',
            uploaded: item.upload_date || '',
        };
    });
}

/**
 * Races multiple search providers to find video results.
 * Falls back to yt-dlp search if all API providers fail.
 */
export async function searchSwarm(query) {
    console.log(`[Swarm] Searching for: "${query}"`);

    // Tier 1: API providers (race them all)
    const apiProviders = [
        // youtube-sr (local scraper)
        (async () => {
            const results = await YouTube.search(query, { limit: 20, type: 'video' });
            if (!results || results.length === 0) throw new Error('youtube-sr no results');
            console.log('[Swarm] ✅ youtube-sr responded first');
            return results.map(item => standardize(item, 'youtube-sr'));
        })(),

        // Healthy Piped instances
        ...healthyPiped.map(async (baseUrl) => {
            const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&filter=videos`, {
                signal: AbortSignal.timeout(8000)
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (!data.items || data.items.length === 0) throw new Error('No items');
            console.log(`[Swarm] ✅ Piped (${baseUrl}) responded first`);
            return data.items.map(item => standardize(item, 'piped'));
        }),

        // Healthy Invidious instances
        ...healthyInvidious.map(async (baseUrl) => {
            const res = await fetch(`${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                signal: AbortSignal.timeout(10000)
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) throw new Error('No items');
            console.log(`[Swarm] ✅ Invidious (${baseUrl}) responded first`);
            return data.slice(0, 20).map(item => standardize(item, 'invidious'));
        }),
    ];

    // Try API providers first
    try {
        return await Promise.any(apiProviders);
    } catch {
        console.log('[Swarm] API providers failed, falling back to yt-dlp search…');
    }

    // Tier 2: yt-dlp search (bypasses third-party filters, works for all queries)
    try {
        const results = await searchWithYtDlp(query);
        console.log(`[Swarm] ✅ yt-dlp search returned ${results.length} results`);
        return results;
    } catch (err) {
        console.error('[Swarm] ❌ yt-dlp search failed:', err.message);
        throw new Error('No results found for this query. Try different search terms.');
    }
}
