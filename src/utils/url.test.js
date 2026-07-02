import { describe, it, expect } from 'vitest';
import { extractVideoId, extractPlaylistId, sanitize } from './url';

describe('extractVideoId', () => {
  it('extracts from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts from URL with extra params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=1')).toBe('dQw4w9WgXcQ');
  });

  it('returns raw input if not a URL (already an ID)', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns empty string for empty input', () => {
    expect(extractVideoId('')).toBe('');
    expect(extractVideoId(null)).toBe('');
    expect(extractVideoId(undefined)).toBe('');
  });

  it('returns full URL when extracted ID not 11 chars (falls back to raw input)', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=short')).toBe('https://www.youtube.com/watch?v=short');
  });
});

describe('extractPlaylistId', () => {
  it('extracts from watch URL with list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123abc')).toBe('PL123abc');
  });

  it('extracts bare list ID', () => {
    expect(extractPlaylistId('PL123abc')).toBe('PL123abc');
  });

  it('returns raw input for URL without list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('returns empty for empty input', () => {
    expect(extractPlaylistId('')).toBe('');
  });
});

describe('sanitize', () => {
  it('allows alphanumeric, underscore, dash', () => {
    expect(sanitize('abc123_-')).toBe('abc123_-');
  });

  it('strips HTML tags', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('scriptalertxssscript');
  });

  it('strips spaces and special chars', () => {
    expect(sanitize('hello world!@#$%')).toBe('helloworld');
  });

  it('returns empty string for empty input', () => {
    expect(sanitize('')).toBe('');
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
  });
});
