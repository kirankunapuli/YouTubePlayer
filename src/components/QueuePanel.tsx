import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

function QueuePanel() {
  const { queue, removeFromQueue, clearQueue, reorderQueue, handlePlay, queueCount } = useApp();
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (queue.length === 0) {
    return (
      <div className="glass-panel" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Queue empty. Add videos from search results.
        </p>
      </div>
    );
  }

  const handleDrop = (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragOverIndex(null);
    if (from === null || from === targetIndex) return;
    reorderQueue(from, targetIndex);
  };

  const itemBorderColor = (index: number) => {
    if (dragOverIndex === index || index === 0) return 'var(--accent-color)';
    return 'var(--glass-border)';
  };

  const thumbUrl = (item: { id: string; thumbnail?: string }) => {
    if (item.thumbnail) return item.thumbnail;
    const ytThumb = `https://i.ytimg.com/vi/${item.id}/default.jpg`;
    return `/api/proxy-image?url=${encodeURIComponent(ytThumb)}`;
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Up Next ({queueCount})</h4>
        <button
          type="button"
          onClick={clearQueue}
          aria-label="Clear entire queue"
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
        aria-label="Video queue"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}
      >
        {queue.map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            className={`glass-panel queue-item${dragOverIndex === index ? ' queue-item-dragover' : ''}`}
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(e: React.DragEvent) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex((prev) => (prev === index ? null : prev))}
            onDrop={(e: React.DragEvent) => {
              e.preventDefault();
              handleDrop(index);
            }}
            onDragEnd={() => {
              dragIndex.current = null;
              setDragOverIndex(null);
            }}
            aria-label={`Queued video: ${item.title || item.id}. Position ${index + 1} of ${queue.length}.`}
            style={{
              borderColor: itemBorderColor(index),
              opacity: dragOverIndex === index ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem',
              cursor: 'grab',
            }}
          >
            <span
              aria-hidden="true"
              title="Drag to reorder"
              style={{ cursor: 'grab', opacity: 0.5, fontSize: '1rem', userSelect: 'none' }}
            >
              ⠿
            </span>
            <div className="queue-item-thumb">
              <img
                src={thumbUrl(item)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="queue-item-title" title={item.title}>
                {item.title || 'Untitled'}
              </div>
              <div className="queue-item-meta">{item.uploaderName || item.author || ''}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => reorderQueue(index, index - 1)}
                  aria-label={`Move ${item.title || 'video'} up`}
                  className="btn-ghost"
                  title="Move up"
                >
                  ↑
                </button>
              )}
              {index < queue.length - 1 && (
                <button
                  type="button"
                  onClick={() => reorderQueue(index, index + 1)}
                  aria-label={`Move ${item.title || 'video'} down`}
                  className="btn-ghost"
                  title="Move down"
                >
                  ↓
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePlay(item.id, item.type || 'video', item.title)}
                aria-label={`Play ${item.title || 'video'} now`}
                className="btn-primary"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => removeFromQueue(index)}
                aria-label={`Remove ${item.title || 'video'} from queue`}
                className="btn-ghost"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default QueuePanel;
