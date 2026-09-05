import { defineConfig, devices } from '@playwright/test';

const PROD_BASE = process.env.PRODUCTION_BASE || 'https://gos-site.pages.dev';
const isProductionRun = process.env.RUN_AGAINST_PRODUCTION === '1';

// Canonical deploy: Cloudflare Pages at root path (GitHub Pages retired 2026-09-05).
const LOCAL_BASE = 'http://localhost:4321';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: '50%',
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: isProductionRun ? PROD_BASE : LOCAL_BASE,
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/run/current-system/sw/bin/chromium',
      args: ['--no-sandbox', '--allow-loopback-in-peer-connection'],
    },
  },
  // webServer only when running mobile-antigravity project locally (needs preview server)
  ...(isProductionRun ? {} : {
    webServer: {
      command: 'pnpm exec astro preview --host 0.0.0.0 --port 4321',
      url: 'http://localhost:4321/',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  }),
  projects: [
    { name: 'mobile-antigravity', testMatch: /theme-antigravity-mobile\.spec\.ts/ },
    { name: 'production-coverage', testMatch: /production-coverage\.spec\.ts/ },
  ],
});