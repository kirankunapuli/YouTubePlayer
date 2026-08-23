/**
 * Media Session API integration — enables OS media keys, lockscreen artwork,
 * and next/prev controls for the player.
 */

interface MediaSessionVideo {
  id: string;
  title?: string;
  uploaderName?: string;
  author?: string;
}

type PlayNextCallback = () => void;

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

export function updateMediaSession(video: MediaSessionVideo | null, onNext: PlayNextCallback): void {
  if (!supported()) return;

  if (!video?.id) {
    navigator.mediaSession.metadata = null;
    return;
  }

  try {
    const thumbUrl = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: video.title || 'Untitled',
      artist: video.uploaderName || video.author || 'YouTube',
      album: 'YoTP Neo',
      artwork: [
        { src: `/api/proxy-image?url=${encodeURIComponent(thumbUrl)}&w=96`, sizes: '96x96', type: 'image/jpeg' },
        { src: `/api/proxy-image?url=${encodeURIComponent(thumbUrl)}&w=256`, sizes: '256x256', type: 'image/jpeg' },
        { src: `/api/proxy-image?url=${encodeURIComponent(thumbUrl)}&w=512`, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('nexttrack', onNext);
    // No previous-track concept — clear it so stale handlers don't fire
    try {
      navigator.mediaSession.setActionHandler('previoustrack', null);
    } catch {
      /* handler not supported */
    }
  } catch (err) {
    console.warn('[MediaSession] Update failed:', err);
  }
}

export function setMediaPlaybackState(state: 'playing' | 'paused'): void {
  if (!supported()) return;
  try {
    navigator.mediaSession.playbackState = state;
  } catch {
    /* ignore */
  }
}
