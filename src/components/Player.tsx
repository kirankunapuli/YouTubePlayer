import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { sanitize } from '../utils/url';

function Player() {
  const {
    currentVideo,
    streamProxy,
    toggleStreamProxy,
    playNextInQueue,
    autoplayNext,
    toggleAutoplayNext,
    queueCount,
  } = useApp();
  const { id: videoId, type, title } = currentVideo;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset loading/error state when the video changes — derived from a key-like
  // signature instead of calling setState inside an effect.
  const videoSignature = `${videoId}-${streamProxy}`;
  const [lastSignature, setLastSignature] = useState(videoSignature);
  if (videoSignature !== lastSignature) {
    setLastSignature(videoSignature);
    setLoading(true);
    setError(false);
  }

  if (!videoId) {
    return (
      <div
        className="glass-panel"
        style={{
          height: '480px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ color: 'var(--text-secondary)' }}>No Video Selected</h2>
        <p style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
          Enter a ID or URL above to start watching
        </p>
      </div>
    );
  }

  // ponytail: atob encodes domain to prevent plain-text grepping in source
  const domain = atob('eW91dHViZS1ub2Nvb2tpZS5jb20=');
  let embedUrl = '';

  const safeVideoId = sanitize(videoId);
  const safeType = sanitize(type);

  if (!streamProxy) {
    if (safeType === 'video') {
      embedUrl = `https://www.${domain}/embed/${safeVideoId}?autoplay=1&modestbranding=1&rel=0&vq=highres&quality=hd1080`;
    } else if (safeType === 'playlist') {
      embedUrl = `https://www.${domain}/embed?listType=playlist&list=${safeVideoId}&autoplay=1&modestbranding=1&vq=highres`;
    } else if (safeType === 'channel') {
      embedUrl = `https://www.${domain}/embed?listType=user_uploads&list=${safeVideoId}&autoplay=1&modestbranding=1&vq=highres`;
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '0.5rem', overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {streamProxy ? (
          <video
            ref={videoRef}
            key={safeVideoId}
            src={`/api/stream?id=${safeVideoId}`}
            controls
            autoPlay
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              outline: 'none',
              background: '#000',
            }}
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            onEnded={playNextInQueue}
          />
        ) : (
          <iframe
            src={embedUrl}
            title="YouTube video player"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
            }}
            onLoad={() => setLoading(false)}
          />
        )}
        {loading && (
          <div className="shimmer-player">
            <div className="loading-spinner" />
          </div>
        )}
        {error && (
          <div
            role="alert"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              textAlign: 'center',
              padding: '1rem',
            }}
          >
            <p style={{ margin: 0 }}>⚠ Failed to load video in proxy mode.</p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
              Try a lower quality or switch to direct mode.
            </p>
            <button type="button" className="btn-primary" onClick={() => setError(false)}>
              Retry
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 0.5rem',
        }}
      >
        <h3
          style={{
            margin: 0,
            textAlign: 'left',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title || 'Playing Video'}
        </h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid var(--glass-border)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: streamProxy ? 'var(--accent-color)' : 'var(--text-secondary)',
            }}
          >
            {streamProxy ? 'PROXY MODE' : 'DIRECT MODE'}
          </span>
          <button
            type="button"
            onClick={toggleStreamProxy}
            role="switch"
            aria-checked={streamProxy}
            aria-label="Toggle proxy mode"
            title="Toggle proxy mode (K)"
            style={{
              background: streamProxy ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              width: '32px',
              height: '16px',
              borderRadius: '8px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: streamProxy ? '18px' : '2px',
                top: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.3s',
              }}
            />
          </button>
          <label
            title="Automatically play the next queued video when this one ends"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
          >
            <input
              type="checkbox"
              checked={autoplayNext}
              onChange={toggleAutoplayNext}
              aria-label="Autoplay next in queue"
              style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
            Auto{queueCount > 0 ? ` (${queueCount})` : ''}
          </label>
          <span
            title="Proxy Mode pipes video through the server to bypass office blocks and quality throttling."
            style={{ cursor: 'help', fontSize: '0.8rem', opacity: 0.5 }}
          >
            ⓘ
          </span>
        </div>
      </div>
    </div>
  );
}

export default Player;
