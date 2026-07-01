interface YouTubeSrItem {
  url?: string;
  title?: string;
  thumbnail?: { url?: string };
  channel?: { name?: string };
  duration_formatted?: string;
  uploadedAt?: string;
}

interface PipedItem {
  url: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  duration?: number | string;
  uploadedDate?: string;
}

interface InvidiousThumbnail {
  url?: string;
}

interface InvidiousItem {
  videoId: string;
  title?: string;
  videoThumbnails?: InvidiousThumbnail[];
  author?: string;
  duration?: number | string;
  publishedText?: string;
}

export interface StandardizedItem {
  url: string;
  type: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  duration?: number | string;
  uploaded?: string;
}

export function standardize(
  item: YouTubeSrItem | PipedItem | InvidiousItem,
  source: string
): StandardizedItem {
  if (source === 'youtube-sr') {
    const sr = item as YouTubeSrItem;
    return {
      url: sr.url || '',
      type: 'video',
      title: sr.title,
      thumbnail: sr.thumbnail?.url,
      uploaderName: sr.channel?.name,
      duration: sr.duration_formatted,
      uploaded: sr.uploadedAt,
    };
  }

  if (source === 'piped') {
    const p = item as PipedItem;
    return {
      url: 'https://www.youtube.com/watch?v=' + (p.url.split('v=')[1] || p.url),
      type: 'video',
      title: p.title,
      thumbnail: p.thumbnail,
      uploaderName: p.uploaderName,
      duration: p.duration,
      uploaded: p.uploadedDate,
    };
  }

  if (source === 'invidious') {
    const inv = item as InvidiousItem;
    return {
      url: 'https://www.youtube.com/watch?v=' + inv.videoId,
      type: 'video',
      title: inv.title,
      thumbnail: inv.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${inv.videoId}/hqdefault.jpg`,
      uploaderName: inv.author,
      duration: inv.duration,
      uploaded: inv.publishedText,
    };
  }

  return item as unknown as StandardizedItem;
}
