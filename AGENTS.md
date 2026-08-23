# YoTP Neo — Agent Context

Privacy-focused YouTube player web app. Watch YouTube without tracking or ads; search uses multiple independent providers.

## Commands

```bash
npm run dev        # server.js + Vite dev server
npm run build      # vite build → dist/
npm start          # production: Express serves dist/ (port 3000)
npm test           # vitest run
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
```

## Stack

- React 19 + TypeScript, Vite 7 (`vite.config.js`) + Workbox PWA (registerType autoUpdate)
- Express 5 server (`server.js`), Node >=18
- Vitest (`vitest.config.js`, setup in `src/test-setup.js`)

## Structure

- `src/components/` — Player, Navbar, SearchResults, QueuePanel, HistoryPanel, GoogleSearch (legacy), ShortcutsModal, ErrorBoundary
- `src/context/AppContext.tsx` — single global state provider (see below)
- `src/hooks/useLocalStorage.ts` — persisted state (JSON, silent quota degradation)
- `src/utils/` — `url.ts` (ID extraction + sanitize), `colors.ts` (dominant color), `mediaSession.ts` (lock-screen media controls)
- `yt-swarm.js` — multi-provider search: races youtube-sr + Piped + Invidious instances via `Promise.any`, falls back to yt-dlp
- `server.js` — search proxy, image proxy, stream proxy
- `validate-image-url.js` — SSRF-safe image URL validation
- `public/robots.txt`, `public/sitemap.xml`, `index.html` meta — SEO

## Key patterns

- API: `/api/search?q=` (swarm), `/api/proxy-image?url=` (SSRF-validated, hostname allowlist), `/api/stream?id=` (yt-dlp resolves, **pipes** upstream with Range support → seekable; HLS via `pipeLiveStream`). SPA fallback to index.html.
- Playback: direct iframe embed via `youtube-nocookie.com` (domain base64-encoded in source to dodge plain-text greps) OR proxy `<video>` from `/api/stream`. If direct embed doesn't fire onLoad within 8s (`DIRECT_EMBED_TIMEOUT_MS`), auto-switch to proxy.
- Search results standardized in `yt-swarm.js` `standardize()`: `duration` normalized M:SS / H:MM:SS (youtube-sr reports ms, others seconds), `isLive` flag → LIVE badge.
- State lives in `AppContext` (useState + useLocalStorage). Persisted keys: `yotp-queue`, `yotp-history` (max 50), `yotp-stream-proxy`, `yotp-theme`, `yotp-autoplay-next`. Current video hydrated from URL params on load.
- Media Session API wired in `App.tsx` — lock-screen metadata + next/prev track handlers.
- Keyboard: `t/T` theater, `n/N` next queue item, `k/K` toggle proxy, `/` focus search, `?` shortcuts modal.

## Conventions

- Match existing code style (Prettier-ish: single quotes, no semicolons, 2-space indent).
- Tests colocated or in `src/utils/` — run `npm test` before finishing; standardize/URL/context have existing suites.
- No new dependencies for what a few lines can do. Keep proxy/SSRF validation strict — this is a privacy app.
- Don't commit `dist/`, `node_modules/`, `.tokensave/`.
