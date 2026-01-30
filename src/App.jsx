import { useState, useEffect } from 'react';
import Player from './components/Player';
import Navbar from './components/Navbar';
import SearchResults from './components/SearchResults';
import GoogleSearch from './components/GoogleSearch';
import { searchVideos } from './services/api';
import { extractColor } from './utils/colors';

function App() {
  const [currentVideo, setCurrentVideo] = useState({ id: '', type: 'video' });
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [streamProxy, setStreamProxy] = useState(false);

  // New Features State
  const [theme, setTheme] = useState('dark');
  const [theaterMode, setTheaterMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Auto-hide reset confirm after 3 seconds
  useEffect(() => {
    let timer;
    if (showResetConfirm) {
      timer = setTimeout(() => setShowResetConfirm(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showResetConfirm]);

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

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleTheater = () => setTheaterMode(prev => !prev);

  // Ambient Mode Logic (Unchanged but ensuring it works)
  useEffect(() => {
    const updateAmbient = async () => {
      // Priority 1: Video Playing
      if (currentVideo.id && currentVideo.type === 'video') {
        // Only fetch if we have an ID
        const thumbUrl = `https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg`;
        const color = await extractColor(thumbUrl);
        document.documentElement.style.setProperty('--ambient-color', color);
      } else {
        // Priority 2: Active Tab Color
        const tabColors = {
          video: '#ff0000',
          search: '#00d2ff',
          google: '#4285f4',
          playlist: '#a020f0',
          channel: '#ff8c00'
        };
        const color = tabColors[activeTab] || '#646cff';
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
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key.toLowerCase() === 't') {
        toggleTheater();
      }
      if (e.key === 'Escape' && theaterMode) {
        setTheaterMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theaterMode]);

  const handlePlay = (id, type, title = '') => {
    setCurrentVideo({ id, type, title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = async (query) => {
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
      setSearchError('Search failed. Please check your network connection.');
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className={`app-container ${theaterMode ? 'theater-active' : ''}`}>
      {/* Cinema Backdrop */}
      {theaterMode && <div className="cinema-overlay" onClick={toggleTheater} />}

      <Navbar
        onPlay={handlePlay}
        onSearch={handleSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        theaterMode={theaterMode}
        toggleTheater={toggleTheater}
      />

      <main className="app-main">
        {/* Main Player Area with wrapper class for promotion */}
        <div className={`theater-mode-wrapper player-container-responsive`}>
          <Player
            videoId={currentVideo.id}
            type={currentVideo.type}
            title={currentVideo.title}
            streamProxy={streamProxy}
            onToggleProxy={() => setStreamProxy(prev => !prev)}
          />
        </div>

        {/* Content below player - Hide in Theater Mode visually */}
        <div style={{ opacity: theaterMode ? 0 : 1, pointerEvents: theaterMode ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
          {activeTab === 'google' ? (
            <GoogleSearch />
          ) : (
            <>
              {loadingSearch && (
                <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem' }}>
                  <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderLeftColor: 'var(--accent-color)',
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p>Ping Swarm: tokhmi, kavin, otter, moomoo...</p>
                </div>
              )}

              {searchError && (
                <div className="glass-panel" style={{ marginTop: '2rem', borderColor: '#ff4444' }}>
                  <p style={{ color: '#ff4444' }}>{searchError}</p>
                </div>
              )}

              {/* Show Piped results - Only if search tab active or explicit results */}
              {activeTab === 'search' && <SearchResults results={searchResults} onPlay={handlePlay} />}
            </>
          )}
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
            cursor: 'default'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.1'}
        >
          <p style={{ margin: 0 }}>YoTP Neo • Private & Secure</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <span>React + Vite</span>
            <span>•</span>
            <span>Neural Glass</span>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {showResetConfirm ? (
                <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                  Are you sure?
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0 8px', fontSize: 'inherit', fontWeight: 'bold' }}
                  >
                    Yes
                  </button>
                  /
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 8px', fontSize: 'inherit' }}
                  >
                    No
                  </button>
                </span>
              ) : <button
                onClick={() => setShowResetConfirm(true)}
                style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: '500' }}
              >
                Reset App
              </button>
              }
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
