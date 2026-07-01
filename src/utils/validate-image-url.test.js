import { describe, it, expect } from 'vitest';
import { validateImageProxyUrl } from '../../validate-image-url.js';

describe('validateImageProxyUrl', () => {
  it('allows valid i.ytimg.com URL', () => {
    const result = validateImageProxyUrl('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(result).not.toBeNull();
    expect(result.hostname).toBe('i.ytimg.com');
  });

  it('allows valid img.youtube.com URL', () => {
    const result = validateImageProxyUrl('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(result).not.toBeNull();
    expect(result.hostname).toBe('img.youtube.com');
  });

  it('rejects non-YouTube host', () => {
    expect(validateImageProxyUrl('https://evil.com/image.jpg')).toBeNull();
  });

  it('rejects IP-literal host', () => {
    expect(validateImageProxyUrl('https://192.168.1.1/image.jpg')).toBeNull();
    expect(validateImageProxyUrl('https://10.0.0.1/image.jpg')).toBeNull();
    expect(validateImageProxyUrl('https://127.0.0.1/image.jpg')).toBeNull();
    expect(validateImageProxyUrl('https://[::1]/image.jpg')).toBeNull();
  });

  it('rejects localhost', () => {
    expect(validateImageProxyUrl('https://localhost/image.jpg')).toBeNull();
  });

  it('rejects private network ranges', () => {
    expect(validateImageProxyUrl('https://172.16.0.1/image.jpg')).toBeNull();
    expect(validateImageProxyUrl('https://0.0.0.0/image.jpg')).toBeNull();
  });

  it('rejects .local hostnames', () => {
    expect(validateImageProxyUrl('https://myhost.local/image.jpg')).toBeNull();
  });

  it('rejects non-http/https protocols', () => {
    expect(validateImageProxyUrl('ftp://i.ytimg.com/file.jpg')).toBeNull();
    expect(validateImageProxyUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects missing URL', () => {
    expect(validateImageProxyUrl('')).toBeNull();
    expect(validateImageProxyUrl(null)).toBeNull();
    expect(validateImageProxyUrl('not-a-url')).toBeNull();
  });

  it('rejects redirects (URL is checked, not followed)', () => {
    // This URL tries to look like allowed host but has evil in path
    const result = validateImageProxyUrl('https://i.ytimg.com@evil.com/file.jpg');
    // The `@` in URL makes `evil.com` the hostname in most URL parsers
    // So it should be rejected for not matching allowed hosts
    expect(result).toBeNull();
  });
});
