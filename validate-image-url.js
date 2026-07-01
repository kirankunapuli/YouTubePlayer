import net from 'net';

const ALLOWED_IMAGE_HOSTS = ['i.ytimg.com', 'img.youtube.com'];

/**
 * Validate a user-provided URL for use with the image proxy to reduce SSRF risk.
 * - Only allow http/https schemes.
 * - Only allow hosts in ALLOWED_IMAGE_HOSTS.
 * - Reject IP-literal hosts and private/internal network ranges.
 */
export function validateImageProxyUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_e) {
    return null;
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return null;
  }

  // Normalize hostname: lowercase and strip trailing dot
  let hostname = url.hostname.toLowerCase();
  if (hostname.endsWith('.')) {
    hostname = hostname.slice(0, -1);
  }

  // Reject IP-literal hosts (IPv4 or IPv6) to avoid direct IP targeting
  if (net.isIP(hostname) !== 0) {
    return null;
  }

  // Block private / internal network ranges
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('0.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.local')
  ) {
    return null;
  }

  // Only allow specific YouTube image domains
  if (!ALLOWED_IMAGE_HOSTS.includes(hostname)) {
    return null;
  }

  // Return canonical URL from validated host
  const safeUrl = new URL(url.toString());
  safeUrl.hostname = hostname;

  return safeUrl;
}
