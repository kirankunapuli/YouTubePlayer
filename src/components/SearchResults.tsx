import { useApp } from '../context/AppContext';
import { getSafeId } from '../utils/url';

function SearchResults() {
  const { searchResults, handlePlay, addToQueue } = useApp();

  if (!searchResults || searchResults.length === 0) return null;

  return (
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
        const videoId = getSafeId(video.url) || video.videoId;
        if (!videoId) return null;

        const thumbnail =
          video.thumbnail ||
          (video.videoThumbnails && video.videoThumbnails[0]?.url);

        return (
          <div
            key={videoId}
            className="glass-panel result-card"
            onClick={() =>
              handlePlay(videoId, 'video', video.title || 'Unknown Video')
            }
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
                  className="duration-badge"
                  style={{
                    position: 'absolute',
                    bottom: '5px',
                    right: '5px',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '2px 4px',
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
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  addToQueue({
                    id: videoId,
                    title: video.title || 'Untitled',
                    thumbnail,
                    uploaderName: video.uploaderName || video.author,
                  });
                }}
                className="btn-ghost"
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                + Queue
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SearchResults;
