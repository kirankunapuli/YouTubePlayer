import { useApp } from '../context/AppContext';

function HistoryPanel() {
  const { history, handlePlay, clearHistory } = useApp();

  const thumbUrl = (id: string) => {
    const ytThumb = `https://i.ytimg.com/vi/${id}/default.jpg`;
    return `/api/proxy-image?url=${encodeURIComponent(ytThumb)}`;
  };

  if (history.length === 0) {
    return (
      <div className="glass-panel" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          No watch history yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Recently Watched ({history.length})
        </h4>
        <button
          type="button"
          onClick={clearHistory}
          aria-label="Clear watch history"
          style={{
            background: 'none',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            padding: '4px 10px',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Clear All
        </button>
      </div>
      <ul
        aria-label="Watch history"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}
      >
        {history.map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem',
            }}
          >
            <button
              type="button"
              aria-label={`Play ${item.title || item.id}`}
              onClick={() => handlePlay(item.id, item.type || 'video', item.title)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: 0,
                background: 'none',
                border: 'none',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                flex: 1,
                minWidth: 0,
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '80px',
                  minWidth: '80px',
                  aspectRatio: '16/9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#000',
                }}
              >
                <img
                  src={thumbUrl(item.id)}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.title}
                >
                  {item.title || 'Untitled'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {item.playedAt
                    ? new Date(item.playedAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : ''}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HistoryPanel;
