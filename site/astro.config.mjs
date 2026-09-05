import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Deploy target: Cloudflare Pages (gos-site.pages.dev, base '/').
// GitHub Pages retired 2026-09-05 (unpublished): single canonical deploy.
export default defineConfig({
  site: 'https://gos-site.pages.dev',
  base: '/',
  output: 'static',
  integrations: [
    svelte(),
  ],
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/*', 'images/*'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webp}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.swal\.dev\/.*/i,
              handler: 'NetworkFirst',
              options: { cacheName: 'swal-api', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 } },
            },
          ],
        },
      }),
    ],
  },
});
