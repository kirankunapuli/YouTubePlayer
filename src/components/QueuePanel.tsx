import { useApp } from '../context/AppContext';

function QueuePanel() {
  const { queue, removeFromQueue, handlePlay, queueCount } = useApp();

  if (queue.length === 0) {
    return (
      <div className="glass-panel" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Queue empty. Add videos from search results.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4 style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)' }}>
        Up Next ({queueCount})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {queue.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={`glass-panel queue-item`}
            style={{
              borderColor: index === 0 ? 'var(--accent-color)' : 'var(--glass-border)',
            }}
          >
            <div className="queue-item-thumb">
              <img
                src={item.thumbnail || `/api/proxy-image?url=${encodeURIComponent(`https://i.ytimg.com/vi/${item.id}/default.jpg`)}`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="queue-item-title" title={item.title}>
                {item.title || 'Untitled'}
              </div>
              <div className="queue-item-meta">
                {item.uploaderName || item.author || ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {index === 0 && (
                <button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handlePlay(item.id, 'video', item.title); }}
                  title="Play now"
                  className="btn-primary"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  Play
                </button>
              )}
              <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); removeFromQueue(index); }}
                title="Remove from queue"
                className="btn-ghost"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QueuePanel;
