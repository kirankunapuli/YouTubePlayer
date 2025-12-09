// Using local robust proxy middleware in vite.config.js
// This single endpoint races multiple instances on the server-side, avoiding CORS.
const API_URL = '/api';

export const searchVideos = async (query) => {
    try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&filter=videos`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Search API Error:', error);
        throw error;
    }
};
