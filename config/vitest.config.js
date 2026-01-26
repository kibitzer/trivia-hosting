import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // This helps resolve ESM/CommonJS compatibility issues in CI
    server: {
      deps: {
        inline: ['jsdom'],
      },
    },
  },
});
