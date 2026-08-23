import { useEffect, useState, useRef } from 'react';
import Player from './components/Player';
import Navbar from './components/Navbar';
import SearchResults from './components/SearchResults';
import GoogleSearch from './components/GoogleSearch';
import QueuePanel from './components/QueuePanel';
import HistoryPanel from './components/HistoryPanel';
import ShortcutsModal from './components/ShortcutsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider, useApp } from './context/AppContext';
import { extractColor } from './utils/colors';
import { updateMediaSession, setMediaPlaybackState } from './utils/mediaSession';

function useTheaterFocusTrap(theaterMode: boolean) {
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (theaterMode) {
      prevFocus.current = document.activeElement as HTMLElement | null;
      const player = document.querySelector<HTMLElement>('.theater-mode-wrapper');
      player?.focus();
    } else if (prevFocus.current) {
      prevFocus.current.focus();
      prevFocus.current = null;
    }
  }, [theaterMode]);

  useEffect(() => {
    if (!theaterMode) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const wrapper = document.querySelector('.theater-mode-wrapper');
      if (!wrapper) return;
      const focusable = wrapper.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, video, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [theaterMode]);
}

const TAB_COLORS: Record<string, string> = {
  video: '#ff0000',
  search: '#00d2ff',
  google: '#4285f4',
  playlist: '#a020f0',
  channel: '#ff8c00',
};

function AppContent() {
  const {
    currentVideo,
    activeTab,
    setActiveTab,
    streamProxy,
    toggleStreamProxy,
    loadingSearch,
    searchError,
    theme,
    theaterMode,
    setTheaterMode,
    showResetConfirm,
    setShowResetConfirm,
    queue,
    handlePlay,
    playNextInQueue,
  } = useApp();

  const [showShortcuts, setShowShortcuts] = useState(false);

  useTheaterFocusTrap(theaterMode);

  // Media Session — OS media keys / lockscreen integration
  useEffect(() => {
    if (currentVideo.id && currentVideo.type === 'video') {
      updateMediaSession(currentVideo, playNextInQueue);
      setMediaPlaybackState('playing');
    } else {
      updateMediaSession(null, playNextInQueue);
    }
  }, [currentVideo, playNextInQueue]);

  // Auto-hide reset confirm after 3 seconds
  useEffect(() => {
    if (!showResetConfirm) return;
    const timer = setTimeout(() => setShowResetConfirm(false), 3000);
    return () => clearTimeout(timer);
  }, [showResetConfirm, setShowResetConfirm]);

  // Apply Theme class
  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  // Handle theater mode overflow
  useEffect(() => {
    if (theaterMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [theaterMode]);

  // Ambient Mode Logic
  useEffect(() => {
    const updateAmbient = async () => {
      if (currentVideo.id && currentVideo.type === 'video') {
        const thumbUrl = `https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg`;
        const color = await extractColor(thumbUrl);
        document.documentElement.style.setProperty('--ambient-color', color);
      } else {
        const color = TAB_COLORS[activeTab] || '#646cff';
        document.documentElement.style.setProperty('--ambient-color', color);
      }
    };
    updateAmbient();
  }, [currentVideo, activeTab]);

  // Document Title Logic
  useEffect(() => {
    if (currentVideo.id && currentVideo.title) {
      document.title = `${currentVideo.title} - YoTP Neo`;
    } else {
      document.title = 'YoTP Neo';
    }
  }, [currentVideo]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName)) {
        if (e.key === 'Escape') {
          activeEl.blur();
        }
        return;
      }

      switch (e.key) {
        case 't':
        case 'T':
          setTheaterMode(prev => !prev);
          break;
        case 'Escape':
          if (showShortcuts) { setShowShortcuts(false); }
          else if (theaterMode) { setTheaterMode(false); }
          break;
        case '/': {
          e.preventDefault();
          const input = document.querySelector<HTMLInputElement>('.navbar-items input');
          input?.focus();
          break;
        }
        case '?':
          setShowShortcuts(prev => !prev);
          break;
        case 'n':
        case 'N': {
          if (queue.length > 0) {
            const next = queue[0];
            handlePlay(next.id, 'video', next.title);
          }
          break;
        }
        case 'k':
        case 'K':
          toggleStreamProxy();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theaterMode, showShortcuts, queue, handlePlay, toggleStreamProxy, setTheaterMode]);

  const renderTabContent = () => {
    if (activeTab === 'google') return <GoogleSearch />;
    if (activeTab === 'queue') return <QueuePanel />;
    if (activeTab === 'history') return <HistoryPanel />;

    return (
      <>
        {loadingSearch && (
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', width: '100%' }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="skeleton-card" style={{ padding: 0 }}>
                <div className="skeleton-thumb" />
                <div style={{ padding: '1rem' }}>
                  <div className="skeleton-line" style={{ marginBottom: '0.5rem' }} />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {searchError && (
          <div className="glass-panel" style={{ marginTop: '2rem', borderColor: /no results/i.test(searchError) ? 'var(--accent-color)' : '#ff4444' }} role="alert">
            <p style={{ color: /no results/i.test(searchError) ? 'var(--text-secondary)' : '#ff4444' }}>
              {searchError}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className="btn-primary"
              style={{ marginTop: '0.75rem', background: '#4285f4' }}
            >
              Try Google Search instead →
            </button>
          </div>
        )}

        {activeTab === 'search' && (
          <ErrorBoundary>
            <SearchResults />
          </ErrorBoundary>
        )}
      </>
    );
  };

  return (
    <div
      className={`app-container ${theaterMode ? 'theater-active' : ''}`}
      role="application"
      aria-label="YoTP Neo YouTube Player"
    >
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {theaterMode && (
        <div
          className="cinema-overlay"
          onClick={() => setTheaterMode(false)}
          aria-hidden="true"
        />
      )}

      <Navbar />

      <main className="app-main" aria-label="Main content">
        {/* tabIndex enables keyboard focus trapping in theater mode */}
        <section
          className="theater-mode-wrapper player-container-responsive"
          tabIndex={theaterMode ? 0 : -1}
          aria-label="Video player"
        >
          <ErrorBoundary>
            <Player key={`${currentVideo.id}-${streamProxy}`} />
          </ErrorBoundary>
        </section>
        <div
          style={{
            opacity: theaterMode ? 0 : 1,
            pointerEvents: theaterMode ? 'none' : 'auto',
            transition: 'opacity 0.3s',
          }}
          aria-hidden={theaterMode}
        >
          {renderTabContent()}
        </div>
      </main>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {!theaterMode && (
        <footer
          style={{
            marginTop: '4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            opacity: 0.1,
            transition: 'opacity 0.3s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.opacity = '0.1'; }}
          role="contentinfo"
        >
          <p style={{ margin: 0 }}>YoTP Neo &bull; Private &amp; Secure</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <span>React + Vite</span>
            <span>&bull;</span>
            <span>Neural Glass</span>
            <span>&bull;</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {showResetConfirm ? (
                <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                  Are you sure?
                  <button
                    type="button"
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0 8px', fontSize: 'inherit', fontWeight: 'bold' }}
                  >
                    Yes
                  </button>
                  {' / '}
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 8px', fontSize: 'inherit' }}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: '500' }}
                  aria-label="Reset app"
                >
                  Reset App
                </button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppProvider>
  );
}

export default App;
