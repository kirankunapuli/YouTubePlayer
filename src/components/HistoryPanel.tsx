import { useApp } from '../context/AppContext';

function HistoryPanel() {
  const { history, handlePlay, clearHistory } = useApp();

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
          onClick={clearHistory}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {history.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="glass-panel"
            onClick={() => handlePlay(item.id, item.type || 'video', item.title)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem',
              cursor: 'pointer',
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
            />
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default HistoryPanel;
