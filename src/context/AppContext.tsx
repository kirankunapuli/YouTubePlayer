import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { extractVideoId } from '../utils/url';

interface SearchResultItem {
  url: string;
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  author?: string;
  duration?: number | string;
  uploaded?: string;
  videoId?: string;
  videoThumbnails?: { url?: string }[];
}

const MAX_HISTORY = 50;

/* ---- Types ---- */

export interface QueueItem {
  id: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  author?: string;
  type?: string;
}

export interface HistoryItem {
  id: string;
  type?: string;
  title?: string;
  playedAt: number;
}

interface CurrentVideo {
  id: string;
  type: string;
  title?: string;
}

export interface AppContextValue {
  currentVideo: CurrentVideo;
  searchResults: SearchResultItem[];
  loadingSearch: boolean;
  searchError: string | null;
  activeTab: string;
  setActiveTab: (t: string) => void;
  streamProxy: boolean;
  setStreamProxy: (v: boolean) => void;
  toggleStreamProxy: () => void;
  theme: string;
  toggleTheme: () => void;
  theaterMode: boolean;
  toggleTheater: () => void;
  setTheaterMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  showResetConfirm: boolean;
  setShowResetConfirm: (v: boolean) => void;
  autoplayNext: boolean;
  toggleAutoplayNext: () => void;
  handlePlay: (id: string, type: string, title?: string) => void;
  playNextInQueue: () => void;
  handleSearch: (query: string) => Promise<void>;
  /* Queue */
  queue: QueueItem[];
  addToQueue: (video: QueueItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  queueCount: number;
  /* History */
  history: HistoryItem[];
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readVideoFromUrl(): CurrentVideo {
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v) {
      const id = extractVideoId(v) || v;
      return { id, type: 'video', title: params.get('t') || '' };
    }
  } catch {
    /* ignore URL parse errors */
  }
  return { id: '', type: 'video' };
}

function syncVideoToUrl(video: CurrentVideo) {
  try {
    const url = new URL(window.location.href);
    if (video.id && video.type === 'video') {
      url.searchParams.set('v', video.id);
      if (video.title) url.searchParams.set('t', video.title);
    } else {
      url.searchParams.delete('v');
      url.searchParams.delete('t');
    }
    window.history.replaceState(null, '', url.toString());
  } catch {
    /* ignore history errors */
  }
}

export function AppProvider({ children }: { readonly children: ReactNode }) {
  // Deep-link restore: ?v=VIDEO_ID
  const [currentVideo, setCurrentVideo] = useState<CurrentVideo>(() => readVideoFromUrl());
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [streamProxy, setStreamProxy] = useLocalStorage<boolean>('yotp-stream-proxy', false);
  const [theme, setTheme] = useLocalStorage<string>('yotp-theme', 'dark');
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoplayNext, setAutoplayNext] = useLocalStorage<boolean>('yotp-autoplay-next', true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [queue, setQueue] = useLocalStorage<QueueItem[]>('yotp-queue', []);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('yotp-history', []);

  // AbortController for in-flight searches — prevents stale responses
  // from overwriting newer results.
  const searchAbortRef = useRef<AbortController | null>(null);

  // Keep latest queue for autoplay-next without re-binding callbacks
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Sync current video to the URL for shareable deep links
  useEffect(() => {
    syncVideoToUrl(currentVideo);
  }, [currentVideo]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  const toggleTheater = useCallback(() => {
    setTheaterMode(prev => !prev);
  }, []);

  const toggleStreamProxy = useCallback(() => {
    setStreamProxy(prev => !prev);
  }, [setStreamProxy]);

  const toggleAutoplayNext = useCallback(() => {
    setAutoplayNext(prev => !prev);
  }, [setAutoplayNext]);

  const handlePlay = useCallback((id: string, type: string, title = '') => {
    setCurrentVideo({ id, type, title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHistory(prev => {
      const entry: HistoryItem = { id, type, title, playedAt: Date.now() };
      const filtered = prev.filter(e => e.id !== id);
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });
  }, [setHistory]);

  /** Plays and removes the first queued item. No-op when autoplay is off or queue empty. */
  const playNextInQueue = useCallback(() => {
    if (!autoplayNext) return;
    const next = queueRef.current[0];
    if (!next) return;
    setQueue(prev => prev.slice(1));
    setCurrentVideo({ id: next.id, type: next.type || 'video', title: next.title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHistory(prev => {
      const entry: HistoryItem = {
        id: next.id,
        type: next.type || 'video',
        title: next.title,
        playedAt: Date.now(),
      };
      const filtered = prev.filter(e => e.id !== next.id);
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });
  }, [autoplayNext, setQueue, setHistory]);

  const handleSearch = useCallback(async (query: string) => {
    // Cancel any in-flight search so a slow old response can't overwrite
    // results of a newer query.
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setLoadingSearch(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      if (controller.signal.aborted) return;
      const results = data.items || [];
      if (results.length > 0) {
        setSearchResults(results);
      } else {
        setSearchError('No results found. The swarm is active but found nothing.');
      }
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return;
      const message = err instanceof Error ? err.message : 'Search failed.';
      setSearchError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingSearch(false);
      }
    }
  }, []);

  const addToQueue = useCallback((video: QueueItem) => {
    setQueue(prev => {
      if (prev.some(v => v.id === video.id)) return prev;
      return [...prev, video];
    });
  }, [setQueue]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, [setQueue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, [setQueue]);

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueue(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [setQueue]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const queueCount = queue.length;

  const value = useMemo<AppContextValue>(() => ({
    currentVideo,
    searchResults,
    loadingSearch,
    searchError,
    activeTab, setActiveTab,
    streamProxy, setStreamProxy, toggleStreamProxy,
    theme, toggleTheme,
    theaterMode, toggleTheater, setTheaterMode,
    showResetConfirm, setShowResetConfirm,
    autoplayNext, toggleAutoplayNext,
    handlePlay,
    playNextInQueue,
    handleSearch,
    queue, addToQueue, removeFromQueue, clearQueue, reorderQueue, queueCount,
    history, clearHistory,
  }), [
    currentVideo, searchResults, loadingSearch, searchError, activeTab,
    streamProxy, setStreamProxy, toggleStreamProxy,
    theme, toggleTheme,
    theaterMode, toggleTheater, setTheaterMode,
    showResetConfirm, setShowResetConfirm,
    autoplayNext, toggleAutoplayNext,
    handlePlay, playNextInQueue, handleSearch,
    queue, addToQueue, removeFromQueue, clearQueue, reorderQueue, queueCount,
    history, clearHistory,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
