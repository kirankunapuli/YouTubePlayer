export const extractColor = (imageSrc) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        // Use local proxy to avoid CORS
        img.src = `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1;
            canvas.height = 1;

            // Draw image scaled down to 1x1 to average colors
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

            resolve(`rgb(${r}, ${g}, ${b})`);
        };

        img.onerror = () => {
            // Fallback color if CORS fails or image load fails
            resolve('var(--accent-color)');
        };
    });
};
