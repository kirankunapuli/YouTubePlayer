import { useState, useEffect } from 'react';

const Player = ({ videoId, type = 'video', title, streamProxy, onToggleProxy }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
    }, [videoId, type, streamProxy]);

    if (!videoId) {
        return (
            <div className="glass-panel" style={{ height: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <h2 style={{ color: 'var(--text-secondary)' }}>No Video Selected</h2>
                <p style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>Enter a ID or URL above to start watching</p>
            </div>
        );
    }

    // Use a pool of privacy-respecting YouTube frontends to completely bypass corporate firewalls
    // that block youtube.com and youtube-nocookie.com
    const getDomain = () => {
        const instances = [
            'yewtu.be',
            'invidious.nerdvpn.de',
            'invidious.tiekoetter.com',
            'inv.tux.rs',
            'iv.ggtyler.dev'
        ];
        // Hash the video ID to consistently use the same instance for the same video
        const index = videoId ? videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % instances.length : 0;
        return instances[index];
    };

    let embedUrl = '';
    const domain = `https://${getDomain()}`;

    // Sanitization to prevent XSS/HTML Injection
    const sanitize = (str) => str ? str.replace(/[^a-zA-Z0-9_-]/g, '') : '';
    const safeVideoId = sanitize(videoId);
    const safeType = sanitize(type);

    if (streamProxy) {
        // Use a more reliable Invidious instance that allows embedding
        // invidious.nerdvpn.de was verified to work in browser testing
        embedUrl = `https://invidious.nerdvpn.de/embed/${safeVideoId}?autoplay=1`;
    } else {
        if (safeType === 'video') {
            // vq=highres is the specific parameter to force high quality in YouTube embeds
            embedUrl = `${domain}/embed/${safeVideoId}?autoplay=1&modestbranding=1&rel=0&vq=highres&quality=hd1080`;
        } else if (safeType === 'playlist') {
            embedUrl = `${domain}/embed?listType=playlist&list=${safeVideoId}&autoplay=1&modestbranding=1&vq=highres`;
        } else if (safeType === 'channel') {
            embedUrl = `${domain}/embed?listType=user_uploads&list=${safeVideoId}&autoplay=1&modestbranding=1&vq=highres`;
        }
    }

    return (
        <div className="glass-panel" style={{ padding: '0.5rem', overflow: 'hidden' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                <iframe
                    src={embedUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                    onLoad={() => setLoading(false)}
                />
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1
                    }}>
                        <div className="loading-spinner" />
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0.5rem' }}>
                <h3 style={{ margin: 0, textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Playing Video'}</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: streamProxy ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                        {streamProxy ? 'PROXY MODE' : 'DIRECT MODE'}
                    </span>
                    <button
                        onClick={onToggleProxy}
                        style={{
                            background: streamProxy ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            width: '32px',
                            height: '16px',
                            borderRadius: '8px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.3s'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            left: streamProxy ? '18px' : '2px',
                            top: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#fff',
                            transition: 'left 0.3s'
                        }} />
                    </button>
                    <span
                        title="Proxy Mode uses auxiliary domains to bypass office blocks and quality throttling."
                        style={{ cursor: 'help', fontSize: '0.8rem', opacity: 0.5 }}
                    >ⓘ</span>
                </div>
            </div>
        </div>
    );
};

export default Player;
