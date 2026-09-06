import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { VitePWA } from 'vite-plugin-pwa'

// Deploy target: Cloudflare Pages (gos-site.pages.dev, base '/').
// GitHub Pages retired 2026-09-05 (unpublished): single canonical deploy.
export default defineConfig({
  site: 'https://gos-site.pages.dev',
  base: '/',
  output: 'static',
  integrations: [svelte()],
  vite: {
    // sigma/graphology se importan dinámicamente (SSR-safe): forzar
    // pre-bundle para que /node_modules/.vite/deps/*.js exista en dev.
    // Sin esto el browser da 504 Outdated Optimize Dep.
    optimizeDeps: {
      include: ['graphology', 'graphology-layout-forceatlas2', 'sigma'],
    },
    plugins: [
      tailwindcss(),
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
              options: {
                cacheName: 'swal-api',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              },
            },
          ],
        },
      }),
    ],
  },
})
