const API_URL = '/api';

export interface SearchResultItem {
  url: string;
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  author?: string;
  duration?: number | string;
  uploaded?: string;
  videoId?: string;
  videoThumbnails?: { url?: string }[];
}

interface SearchResponse {
  items?: SearchResultItem[];
  error?: string;
}

export const searchVideos = async (query: string): Promise<SearchResultItem[]> => {
  const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&filter=videos`);
  if (!response.ok) throw new Error('Search failed');
  const data: SearchResponse = await response.json();
  return data.items || [];
};
