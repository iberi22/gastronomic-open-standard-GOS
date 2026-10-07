import svelte from '@astrojs/svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { VitePWA } from 'vite-plugin-pwa'

// Deploy target: Cloudflare Pages (dominio canonico gos.swal.network, base '/').
// GitHub Pages retired 2026-09-05 (unpublished): single canonical deploy.
export default defineConfig({
  // Debe coincidir con SITE_URL de src/lib/seo.ts. Con el host de Pages
  // aqui, Astro generaba canonical/og:url/rss con gos-site.pages.dev.
  site: 'https://gos.swal.network',
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
        // SW desactivado en dev: un SW registrado intercepta localhost y
        // sirve respuestas rancias/rotas (incidente 2026-09-06: clone de
        // Response + deps 504). En prod (preview/build) sigue activo.
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webp}'],
          runtimeCaching: [
            {
              // API propia de GOS: NetworkFirst para que los datos frescos
              // (evidence, grafo) no queden rancios offline.
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'gos-api',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
              },
            },
          ],
        },
      }),
    ],
  },
})
