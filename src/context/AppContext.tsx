import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { searchVideos, SearchResultItem } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
  handlePlay: (id: string, type: string, title?: string) => void;
  handleSearch: (query: string) => Promise<void>;
  /* Queue */
  queue: QueueItem[];
  addToQueue: (video: QueueItem) => void;
  removeFromQueue: (index: number) => void;
  queueCount: number;
  /* History */
  history: HistoryItem[];
  clearHistory: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<CurrentVideo>({ id: '', type: 'video' });
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [streamProxy, setStreamProxy] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [theaterMode, setTheaterMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [queue, setQueue] = useLocalStorage<QueueItem[]>('yotp-queue', []);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('yotp-history', []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleTheater = useCallback(() => {
    setTheaterMode(prev => !prev);
  }, []);

  const toggleStreamProxy = useCallback(() => {
    setStreamProxy(prev => !prev);
  }, []);

  const handlePlay = useCallback((id: string, type: string, title = '') => {
    setCurrentVideo({ id, type, title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHistory(prev => {
      const entry: HistoryItem = { id, type, title, playedAt: Date.now() };
      const filtered = prev.filter(e => e.id !== id);
      return [entry, ...filtered].slice(0, MAX_HISTORY);
    });
  }, [setHistory]);

  const handleSearch = useCallback(async (query: string) => {
    setLoadingSearch(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const results = await searchVideos(query);
      if (results && results.length > 0) {
        setSearchResults(results);
      } else {
        setSearchError('No results found. The swarm is active but found nothing.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed.';
      setSearchError(message);
    } finally {
      setLoadingSearch(false);
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

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const queueCount = queue.length;

  const value: AppContextValue = {
    currentVideo,
    searchResults,
    loadingSearch,
    searchError,
    activeTab, setActiveTab,
    streamProxy, setStreamProxy, toggleStreamProxy,
    theme, toggleTheme,
    theaterMode, toggleTheater, setTheaterMode,
    showResetConfirm, setShowResetConfirm,
    handlePlay,
    handleSearch,
    queue, addToQueue, removeFromQueue, queueCount,
    history, clearHistory,
  };

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
