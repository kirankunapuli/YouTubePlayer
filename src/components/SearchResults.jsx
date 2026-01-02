const SearchResults = ({ results, onPlay }) => {
    if (!results || results.length === 0) return null;

    const getSafeId = (url) => {
        if (!url) return '';
        // Handle full URL from ytsr
        if (url.includes('v=')) {
            return url.split('v=')[1]?.split('&')[0];
        }
        // Handle if it's already an ID (fallback)
        if (url.length === 11) return url;
        return '';
    };

    return (
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', width: '100%' }}>
            {results.map((video, index) => {
                const videoId = getSafeId(video.url) || video.videoId; // Use helper

                // Skip if no ID found (invalid result)
                if (!videoId) return null;

                const thumbnail = video.thumbnail || (video.videoThumbnails && video.videoThumbnails[0]?.url);

                return (
                    <div
                        key={videoId + index} // Use index fallback to avoid duplicate key crash
                        className="glass-panel"
                        onClick={() => onPlay(videoId, 'video', video.title || 'Unknown Video')}
                        style={{
                            padding: '0',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                            <img
                                src={thumbnail}
                                alt={video.title || 'Video'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }} // Safe image
                            />
                            {videoId && (
                                <div style={{
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
                                    zIndex: 2
                                }}>
                                    ID: {videoId}
                                </div>
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: '5px',
                                right: '5px',
                                background: 'rgba(0,0,0,0.8)',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}>
                                {/* Safe duration display: ytsr returns string "3:45", Piped returns number. Just display if existing. */}
                                {video.duration || ''}
                            </div>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
                                {video.title || 'Untitled'}
                            </h4>
                            <p style={{ margin: '0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {video.uploaderName || video.author || 'Unknown'}
                            </p>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {video.uploaded || ''}
                            </p>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

export default SearchResults;
