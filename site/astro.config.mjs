import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
// import cloudflare from '@astrojs/cloudflare';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  site: 'https://iberi22.github.io',
  base: '/gastronomic-open-standard-GOS',
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
  // Keep Cloudflare adapter for Pages_Functions if deploying to CF; for GH Pages it's ignored with output static
  // adapter: cloudflare()  -> disabled for static GH Pages; enable when deploying to CF
});
