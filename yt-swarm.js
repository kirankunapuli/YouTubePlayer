import YouTubeSr from 'youtube-sr';
import fetch from 'node-fetch';
import yts from 'yt-search';
const YouTube = YouTubeSr.default || YouTubeSr;

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

/**
 * Standardizes search results from various providers into a single format.
 */
const standardize = (item, source) => {
    if (source === 'youtube-sr') {
        return {
            url: item.url,
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail?.url,
            uploaderName: item.channel?.name,
            duration: item.duration_formatted,
            uploaded: item.uploadedAt
        };
    }

    // Piped format
    if (source === 'piped') {
        return {
            url: 'https://www.youtube.com/watch?v=' + item.url.split('v=')[1] || item.url,
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail,
            uploaderName: item.uploaderName,
            duration: item.duration,
            uploaded: item.uploadedDate
        };
    }

    // Invidious format
    if (source === 'invidious') {
        return {
            url: 'https://www.youtube.com/watch?v=' + item.videoId,
            type: 'video',
            title: item.title,
            thumbnail: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
            uploaderName: item.author,
            duration: item.duration, // usually in seconds or formatted? Invidious varies
            uploaded: item.publishedText
        };
    }

    // yt-search format
    if (source === 'yt-search') {
        return {
            url: item.url,
            type: 'video',
            title: item.title,
            thumbnail: item.thumbnail,
            uploaderName: item.author.name,
            duration: item.timestamp,
            uploaded: item.ago
        };
    }

    return item;
};

/**
 * Races multiple search providers to find video results.
 */
export async function searchSwarm(query) {
    console.log(`[Swarm] Searching for: "${query}"`);

    const providers = [
        // Provider 1: yt-search (Very robust local scraper)
        (async () => {
            try {
                const r = await yts(query);
                const results = r.videos || [];
                if (results.length === 0) throw new Error('yt-search no results');
                console.log('[Swarm] ✅ yt-search responded first');
                return results.slice(0, 20).map(item => standardize(item, 'yt-search'));
            } catch (e) {
                console.error('[Swarm] ❌ yt-search failed:', e.message);
                throw e;
            }
        })(),

        // Provider 2: youtube-sr (Scraper)
        (async () => {
            try {
                const results = await YouTube.search(query, { limit: 20, type: 'video' });
                if (!results || results.length === 0) throw new Error('youtube-sr no results');
                console.log('[Swarm] ✅ youtube-sr responded first');
                return results.map(item => standardize(item, 'youtube-sr'));
            } catch (e) {
                console.error('[Swarm] ❌ youtube-sr failed:', e.message);
                throw e;
            }
        })(),

        // Providers 2-N: Piped Instances
        ...PIPED_INSTANCES.map(async (baseUrl) => {
            try {
                const res = await fetch(`${baseUrl}/search?q=${encodeURIComponent(query)}&filter=videos`, {
                    signal: AbortSignal.timeout(8000)
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                if (!data.items || data.items.length === 0) throw new Error('No items');
                console.log(`[Swarm] ✅ Piped (${baseUrl}) responded first`);
                return data.items.map(item => standardize(item, 'piped'));
            } catch (e) {
                // console.error(`[Swarm] ❌ Piped (${baseUrl}) failed:`, e.message);
                throw e;
            }
        }),

        // Providers N-M: Invidious Instances
        ...INVIDIOUS_INSTANCES.map(async (baseUrl) => {
            try {
                // Invidious search API: /api/v1/search?q=...&type=video
                const res = await fetch(`${baseUrl}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
                    signal: AbortSignal.timeout(10000)
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) throw new Error('No items');
                console.log(`[Swarm] ✅ Invidious (${baseUrl}) responded first`);
                return data.slice(0, 20).map(item => standardize(item, 'invidious'));
            } catch (e) {
                throw e;
            }
        })
    ];

    try {
        // Race all providers. Promise.any returns the first that resolves successfully.
        return await Promise.any(providers);
    } catch (err) {
        console.error('[Swarm] 💀 All providers failed');
        throw new Error('Search failed. All swarm members are down or blocked.');
    }
}
