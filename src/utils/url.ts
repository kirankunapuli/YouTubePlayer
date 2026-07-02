export function extractVideoId(val?: string | null): string {
  if (!val) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = val.match(regExp);
  return match && match[2].length === 11 ? match[2] : val;
}

export function extractPlaylistId(val?: string | null): string {
  if (!val) return '';
  const regExp = /[?&]list=([^#&?]+)/;
  const match = val.match(regExp);
  return match ? match[1] : val;
}

export function sanitize(str?: string | null): string {
  return str ? str.replace(/[^a-zA-Z0-9_-]/g, '') : '';
}
