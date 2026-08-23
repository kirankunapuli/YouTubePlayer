import YouTubeSr from 'youtube-sr';
import youtubedl from 'youtube-dl-exec';
const YouTube = YouTubeSr.default || YouTubeSr;

/** Format a duration in seconds as M:SS or H:MM:SS. */
export function formatDuration(seconds) {
    const s = Number(seconds);
    if (!Number.isFinite(s) || s < 0) return undefined;
    const total = Math.round(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Normalize a duration from any provider (seconds, ms, or pre-formatted string). */
export function normalizeDuration(value) {
    if (value == null) return undefined;
    if (typeof value === 'number') {
        // youtube-sr reports milliseconds; Piped/Invidious report seconds.
        return formatDuration(value >= 100000 ? value / 1000 : value);
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        return formatDuration(Number(value));
    }
    return value; // already formatted like "3:45"
}

/**
 * Providers signal live streams with a zero/null duration.
 * Returns true when the result is (very likely) a live stream.
 */
export function isLiveResult(item) {
    const d = item.duration;
    if (item.live || item.isLive) return true;
    if (d === 0 || d === '0' || d === '0:00' || d == null) return true;
    return false;
}

/** Standardize search results from various providers into a single format. */
export function standardize(item, source) {
    const live = isLiveResult(item);
    let rawDuration = item.duration;
    if (source === 'youtube-sr') {
        rawDuration = item.duration_formatted ?? item.duration;
    }
    const duration = live ? 'LIVE' : normalizeDuration(rawDuration);
    const base = { duration, isLive: live };
    if (source === 'youtube-sr') {
        return {
            ...base,
            url: item.url,
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail?.url,
            uploaderName: item.channel?.name,
            uploaded: item.uploadedAt,
        };
    }
    if (source === 'piped') {
        return {
            ...base,
            url: 'https://www.youtube.com/watch?v=' + (item.url.split('v=')[1] || item.url),
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail,
            uploaderName: item.uploaderName,
            uploaded: item.uploadedDate,
        };
    }
    if (source === 'invidious') {
        return {
            ...base,
            url: 'https://www.youtube.com/watch?v=' + item.videoId,
            type: 'video',
            title: item.title,
            thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            uploaderName: item.author,
            uploaded: item.publishedText,
        };
    }
    return { ...item, ...base };
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

async function checkInstance(baseUrl, healthPath) {
    try {
        const res = await fetch(`${baseUrl}${healthPath}`, {
            signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT),
        });
        return res.ok ? baseUrl : null;
    } catch {
        return null;
    }
}

let healthyPiped = [...PIPED_INSTANCES];
let healthyInvidious = [...INVIDIOUS_INSTANCES];

// Track per-instance failure counts so instances that fail at request time
// get demoted without waiting for the next periodic health check.
const failureCounts = new Map(); // baseUrl -> consecutive failures
const DEMOTE_THRESHOLD = 2;

function recordFailure(baseUrl) {
  const count = (failureCounts.get(baseUrl) || 0) + 1;
  failureCounts.set(baseUrl, count);
  if (count >= DEMOTE_THRESHOLD) {
    healthyPiped = healthyPiped.filter((u) => u !== baseUrl);
    healthyInvidious = healthyInvidious.filter((u) => u !== baseUrl);
    console.warn(`[Swarm] Demoted instance after ${count} failures: ${baseUrl}`);
  }
}

function recordSuccess(baseUrl) {
  failureCounts.delete(baseUrl);
}

// Periodic re-check so dead instances don't cause 8-10s timeouts forever.
const HEALTH_RECHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let healthCheckTimer = null;

export function startHealthCheckInterval() {
  if (healthCheckTimer) return;
  healthCheckTimer = setInterval(() => {
    runSwarmHealthCheck().catch((err) =>
      console.error('[Swarm] Periodic health check failed:', err.message)
    );
  }, HEALTH_RECHECK_INTERVAL_MS);
  // Don't keep the process alive just for this timer
  healthCheckTimer.unref();
}

export function stopHealthCheckInterval() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

export function getSwarmStatus() {
  return {
    pipedHealthy: healthyPiped.length,
    pipedTotal: PIPED_INSTANCES.length,
    invidiousHealthy: healthyInvidious.length,
    invidiousTotal: INVIDIOUS_INSTANCES.length,
  };
}

/**
 * Run a one-time health check against all Piped and Invidious instances.
 */
export async function runSwarmHealthCheck() {
    console.log('[Swarm] Running health check…');

    const [pipedResults, invidiousResults] = await Promise.all([
        Promise.all(PIPED_INSTANCES.map(async (url) => {
            const ok = await checkInstance(url, '/health');
            if (!ok) console.warn(`[Swarm]   ❌ Piped down: ${url}`);
            else console.log(`[Swarm]   ✅ Piped ok: ${url}`);
            return ok;
        })),
        Promise.all(INVIDIOUS_INSTANCES.map(async (url) => {
            const ok = await checkInstance(url, '/api/v1/stats');
            if (!ok) console.warn(`[Swarm]   ❌ Invidious down: ${url}`);
            else console.log(`[Swarm]   ✅ Invidious ok: ${url}`);
            return ok;
        })),
    ]);

    healthyPiped = pipedResults.filter(Boolean);
    healthyInvidious = invidiousResults.filter(Boolean);
    failureCounts.clear();

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
        { dumpJson: true, flatPlaylist: true, noWarnings: true, preferFreeFormats: true, jsRuntimes: 'node' },
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
 * Losing providers are aborted once a winner is found.
 */
export async function searchSwarm(query) {
    console.log(`[Swarm] Searching for: "${query}"`);

    const controller = new AbortController();
    const { signal } = controller;

    // Tier 1: API providers (race them all)
    const apiProviders = [
        // youtube-sr (local scraper)
        (async () => {
            const results = await YouTube.search(query, { limit: 20, type: 'video' });
            if (!results || results.length === 0) throw new Error('youtube-sr no results');
            controller.abort(); // cancel losing fetches
            return results.map(item => standardize(item, 'youtube-sr'));
        })(),

        // Healthy Piped instances
        ...healthyPiped.map(async (baseUrl) => {
            try {
                const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&filter=videos`, {
                    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                if (!data.items || data.items.length === 0) throw new Error('No items');
                recordSuccess(baseUrl);
                controller.abort(); // cancel losing fetches
                return data.items.map(item => standardize(item, 'piped'));
            } catch (err) {
                if (!signal.aborted) recordFailure(baseUrl);
                throw err;
            }
        }),

        // Healthy Invidious instances
        ...healthyInvidious.map(async (baseUrl) => {
            try {
                const res = await fetch(`${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) throw new Error('No items');
                recordSuccess(baseUrl);
                controller.abort(); // cancel losing fetches
                return data.slice(0, 20).map(item => standardize(item, 'invidious'));
            } catch (err) {
                if (!signal.aborted) recordFailure(baseUrl);
                throw err;
            }
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
