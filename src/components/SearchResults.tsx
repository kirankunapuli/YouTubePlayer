import { useApp } from '../context/AppContext';
import { extractVideoId } from '../utils/url';

function SearchResults() {
  const { searchResults, handlePlay, addToQueue, setActiveTab } = useApp();

  if (!searchResults || searchResults.length === 0) return null;

  return (
    <>
      <div
        className="results-grid"
        style={{
          marginTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        {searchResults.map((video) => {
          const videoId = extractVideoId(video.url) || video.videoId;
          if (!videoId) return null;

          const thumbnail =
            video.thumbnail || video.videoThumbnails?.[0]?.url;

          return (
            <button
              type="button"
              key={videoId}
              className="glass-panel result-card"
              aria-label={`Play ${video.title || 'video'}`}
              onClick={() =>
                handlePlay(videoId, 'video', video.title || 'Unknown Video')
              }
              style={{ textAlign: 'left', padding: 0, cursor: 'pointer' }}
            >
              <div className="result-card-thumb">
                <img
                  src={thumbnail}
                  alt={video.title || 'Video'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {videoId && (
                  <div
                    className="id-badge"
                    style={{
                      position: 'absolute',
                      top: '5px',
                      left: '5px',
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(4px)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      border: '1px solid var(--accent-color)',
                      color: 'var(--accent-color)',
                      fontWeight: 'bold',
                      zIndex: 2,
                    }}
                  >
                    ID: {videoId}
                  </div>
                )}
                {video.duration && (
                  <div
                    className={`duration-badge${video.isLive ? ' live-badge' : ''}`}
                    style={{
                      position: 'absolute',
                      bottom: '5px',
                      right: '5px',
                      background: video.isLive ? '#ff0000' : 'rgba(0,0,0,0.8)',
                      color: video.isLive ? '#fff' : undefined,
                      fontWeight: video.isLive ? 700 : undefined,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                    }}
                  >
                    {video.duration}
                  </div>
                )}
              </div>
              <div className="result-card-body">
                <h4 className="result-card-title">
                  {video.title || 'Untitled'}
                </h4>
                <p className="result-card-meta">
                  {video.uploaderName || video.author || 'Unknown'}
                </p>
                <p className="result-card-date">
                  {video.uploaded || ''}
                </p>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    addToQueue({
                      id: videoId,
                      title: video.title || 'Untitled',
                      thumbnail,
                      uploaderName: video.uploaderName || video.author,
                    });
                  }}
                  aria-label={`Add ${video.title || 'video'} to queue`}
                  className="btn-ghost"
                  style={{ marginTop: '0.5rem', width: '100%' }}
                >
                  + Queue
                </button>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: '2.5rem', textAlign: 'center', padding: '0.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Not finding what you need?{' '}
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            style={{ background: 'none', border: 'none', color: '#4285f4', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: 0, textDecoration: 'underline' }}
          >
            Try Google Web Search →
          </button>
        </p>
      </div>
    </>
  );
}

export default SearchResults;
