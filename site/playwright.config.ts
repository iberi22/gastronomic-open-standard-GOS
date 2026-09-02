import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: '50%',
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    launchOptions: {
      executablePath: '/run/current-system/sw/bin/chromium',
      args: ['--no-sandbox', '--allow-loopback-in-peer-connection'],
    },
  },
  webServer: {
    command: 'pnpm exec astro preview --host 0.0.0.0 --port 4321',
    url: 'http://localhost:4321/gastronomic-open-standard-GOS/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'mobile-antigravity', testMatch: /theme-antigravity-mobile\.spec\.ts/ },
  ],
});
