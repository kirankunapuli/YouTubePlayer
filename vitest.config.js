import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/*.ts',
        'validate-image-url.js',
        'src/context/*.tsx',
        'src/components/ErrorBoundary.tsx',
      ],
    },
  },
});
