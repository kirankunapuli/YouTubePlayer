import { describe, it, expect } from 'vitest';
import { standardize } from './standardize';

describe('standardize', () => {
  it('standardizes youtube-sr format', () => {
    const input = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Video',
      thumbnail: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
      channel: { name: 'TestChannel' },
      duration_formatted: '3:45',
      uploadedAt: '2 years ago',
    };
    const result = standardize(input, 'youtube-sr');
    expect(result.url).toBe(input.url);
    expect(result.title).toBe('Test Video');
    expect(result.thumbnail).toBe(input.thumbnail.url);
    expect(result.uploaderName).toBe('TestChannel');
    expect(result.duration).toBe('3:45');
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
    expect(result.duration).toBe(225);
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
    expect(result.duration).toBe(210);
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
    const input = { foo: 'bar' };
    expect(standardize(input, 'unknown')).toBe(input);
  });
});
