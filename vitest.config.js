import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
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
