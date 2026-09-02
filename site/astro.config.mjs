import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Deploy targets: Cloudflare Pages (default, base '/') o GitHub Pages (DEPLOY_TARGET=github-pages)
const isGH = process.env.DEPLOY_TARGET === 'github-pages';

export default defineConfig({
  site: isGH ? 'https://iberi22.github.io' : 'https://gos-site.pages.dev',
  base: isGH ? '/gastronomic-open-standard-GOS' : '/',
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
