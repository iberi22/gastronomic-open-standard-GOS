import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/lib/setup.ts'],
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      '.astro',
      'tests/e2e/**',
      'playwright.config.*',
    ],
  },
})
