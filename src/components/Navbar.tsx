import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { extractVideoId, extractPlaylistId } from '../utils/url';

function Navbar() {
  const {
    activeTab,
    setActiveTab,
    theme,
    toggleTheme,
    theaterMode,
    toggleTheater,
    handlePlay,
    handleSearch,
    queueCount,
  } = useApp();

  const [inputVal, setInputVal] = useState('');

  const extractId = (val: string, type: string) => {
    if (!val) return '';
    if (type === 'video') return extractVideoId(val);
    if (type === 'playlist') return extractPlaylistId(val);
    return val;
  };

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'search') {
      handleSearch(inputVal);
    } else {
      const id = extractId(inputVal, activeTab);
      if (id) {
        handlePlay(id, activeTab);
      }
    }
  };

  const navItems = [
    { id: 'search', icon: '🔍', label: 'Search YoTP Neo', color: '#00d2ff', placeholder: 'Search YoTP Neo...' },
    { id: 'queue', icon: '▶', label: 'Queue', color: '#f59e0b', placeholder: '', badge: queueCount },
    { id: 'history', icon: '⏱', label: 'History', color: '#10b981', placeholder: '' },
    { id: 'video', icon: '▶', label: 'Video ID', color: '#ff0000', placeholder: 'Paste Video URL/ID' },
    { id: 'playlist', icon: '📜', label: 'Playlist', color: '#a020f0', placeholder: 'Paste Playlist ID' },
    { id: 'channel', icon: '👤', label: 'Channel', color: '#ff8c00', placeholder: 'Paste Channel Name' },
    { id: 'google', icon: 'G', label: 'Google Search', color: '#4285f4', placeholder: 'Use Google Search below' },
  ];

  const activeItem = navItems.find((item) => item.id === activeTab);
  const brandColor = activeItem ? activeItem.color : 'var(--accent-color)';

  return (
    <nav
      className="glass-panel navbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        margin: 0,
        padding: '0.8rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      {/* Branding */}
      <div
        className="logo navbar-logo"
        style={{ fontSize: '1.4rem', fontWeight: 800, whiteSpace: 'nowrap' }}
      >
        <span style={{ color: 'var(--text-primary)' }}>YoTP</span>
        <span
          style={{
            color: brandColor,
            transition: 'color 0.5s ease',
            marginLeft: '4px',
          }}
        >
          Neo
        </span>
      </div>

      {/* Dynamic Nav Items */}
      <div
        className="nav-items navbar-items"
        role="tablist"
        aria-label="Navigation tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          padding: '0.2rem 0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          maxWidth: '100%',
          width: '100%',
          flexWrap: 'nowrap',
        }}
      >
        <style>{`
          .nav-items::-webkit-scrollbar { display: none; }
        `}</style>
        {navItems.map((item) => (
          <div
            key={item.id}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <button
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              role="tab"
              aria-selected={activeTab === item.id}
              aria-label={item.label}
              style={{
                background: activeTab === item.id ? item.color : 'transparent',
                color: activeTab === item.id ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${activeTab === item.id ? item.color : 'transparent'}`,
                borderRadius: '12px',
                padding: '0.4rem 0.8rem',
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === item.id ? `0 0 15px ${item.color}40` : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  marginRight: activeTab === item.id ? '8px' : '0',
                  display: activeTab === item.id ? 'inline-block' : 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  background: item.color,
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}>{item.badge > 9 ? '9+' : item.badge}</span>
              )}
            </button>

            {activeTab === item.id && !['google', 'queue', 'history'].includes(activeTab) && (
              <form
                key={activeTab}
                onSubmit={handleAction}
                style={{
                  display: 'flex',
                  gap: '8px',
                  animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ position: 'relative', minWidth: '150px' }}>
                  <input
                    type="text"
                    placeholder={item.placeholder}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    autoFocus
                    aria-label={item.placeholder}
                    style={{
                      width: '100%',
                      background: 'var(--input-bg)',
                      border: `2px solid ${item.color}`,
                      borderRadius: '12px',
                      padding: '0 1rem',
                      height: '36px',
                      color: 'var(--text-primary)',
                      transition: 'border-color 0.3s',
                      boxSizing: 'border-box',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    height: '36px',
                    borderRadius: '12px',
                    padding: '0 0.8rem',
                    background: item.color,
                    border: 'none',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    boxShadow: `0 0 10px ${item.color}40`,
                  }}
                >
                  Go
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      {/* Right Toggles */}
      <div
        className="nav-actions navbar-actions"
        style={{ display: 'flex', gap: '0.5rem' }}
      >
        <button
          onClick={toggleTheater}
          title="Theater Mode"
          aria-label={`${theaterMode ? 'Exit' : 'Enter'} theater mode`}
          style={{
            background: theaterMode ? 'var(--text-primary)' : 'transparent',
            color: theaterMode ? 'var(--bg-dark)' : 'var(--text-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theaterMode ? '⤢' : '⤡'}
        </button>

        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); width: 0; overflow: hidden; }
          to { opacity: 1; transform: translateX(0); width: auto; overflow: visible; }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
