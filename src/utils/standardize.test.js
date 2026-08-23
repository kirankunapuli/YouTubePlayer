import { describe, it, expect } from 'vitest';
import { standardize } from '../../yt-swarm.js';

describe('standardize', () => {
  it('standardizes youtube-sr format', () => {
    const input = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Video',
      thumbnail: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
      channel: { name: 'TestChannel' },
      duration: 225000,
      duration_formatted: '3:45',
      uploadedAt: '2 years ago',
    };
    const result = standardize(input, 'youtube-sr');
    expect(result.url).toBe(input.url);
    expect(result.title).toBe('Test Video');
    expect(result.thumbnail).toBe(input.thumbnail.url);
    expect(result.uploaderName).toBe('TestChannel');
    expect(result.duration).toBe('3:45');
    expect(result.isLive).toBe(false);
    expect(result.uploaded).toBe('2 years ago');
  });

  it('standardizes piped format', () => {
    const input = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Piped Video',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      uploaderName: 'PipedChannel',
      duration: 225,
      uploadedDate: '2024-01-15',
    };
    const result = standardize(input, 'piped');
    expect(result.url).toBe(input.url);
    expect(result.title).toBe('Piped Video');
    expect(result.uploaderName).toBe('PipedChannel');
    expect(result.duration).toBe('3:45');
  });

  it('formats piped duration over an hour as H:MM:SS', () => {
    const input = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Long Video',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      uploaderName: 'PipedChannel',
      duration: 3675,
      uploadedDate: '2024-01-15',
    };
    const result = standardize(input, 'piped');
    expect(result.duration).toBe('1:01:15');
    expect(result.isLive).toBe(false);
  });

  it('marks zero-duration results as LIVE', () => {
    const input = {
      url: 'https://www.youtube.com/watch?v=rFZHOHl-L8A',
      title: 'Live Stream',
      thumbnail: { url: 'https://i.ytimg.com/vi/rFZHOHl-L8A/hqdefault.jpg' },
      channel: { name: 'Lofi Girl' },
      duration: 0,
      uploadedAt: null,
    };
    const result = standardize(input, 'youtube-sr');
    expect(result.isLive).toBe(true);
    expect(result.duration).toBe('LIVE');
  });

  it('standardizes invidious format', () => {
    const input = {
      videoId: 'dQw4w9WgXcQ',
      title: 'Invidious Video',
      videoThumbnails: [{ url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }],
      author: 'InvChannel',
      duration: 210,
      publishedText: '3 months ago',
    };
    const result = standardize(input, 'invidious');
    expect(result.url).toContain('dQw4w9WgXcQ');
    expect(result.title).toBe('Invidious Video');
    expect(result.uploaderName).toBe('InvChannel');
    expect(result.duration).toBe('3:30');
    expect(result.uploaded).toBe('3 months ago');
  });

  it('falls back to thumbnail from videoId when thumbnails empty', () => {
    const input = {
      videoId: 'dQw4w9WgXcQ',
      title: 'No Thumb',
      videoThumbnails: [],
      author: 'Author',
    };
    const result = standardize(input, 'invidious');
    expect(result.thumbnail).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('returns raw item for unknown source', () => {
    const input = { foo: 'bar', duration: 120 };
    const result = standardize(input, 'unknown');
    expect(result.foo).toBe('bar');
    expect(result.duration).toBe('2:00');
  });
});
