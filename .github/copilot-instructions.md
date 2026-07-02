# YoTP Neo — Copilot Context

This is a privacy-focused YouTube player web app.

## Stack
- React 19 + TypeScript (src/)
- Vite 7 (vite.config.js)
- Express 5 server (server.js)
- Vitest for tests (vitest.config.js)

## Structure
- `src/components/` — React components (Player, Navbar, SearchResults, QueuePanel, HistoryPanel, GoogleSearch, ShortcutsModal, ErrorBoundary)
- `src/context/AppContext.tsx` — All app state (current video, search, queue, history, theme, theater mode, proxy mode)
- `src/utils/` — URL helpers, color extraction
- `yt-swarm.js` — YouTube search: races youtube-sr, Piped API, Invidious API, yt-dlp
- `server.js` — Express server: search proxy, image proxy, stream proxy
- `validate-image-url.js` — SSRF-safe image URL validation for proxy

## Key patterns
- API calls go through Express `/api/search`, `/api/proxy-image`, `/api/stream`
- Search uses a multi-provider "swarm" approach
- Video playback: direct embed (youtube-nocookie.com) or proxy mode (youtube-dl)
- State managed in AppContext via useState + useLocalStorage
