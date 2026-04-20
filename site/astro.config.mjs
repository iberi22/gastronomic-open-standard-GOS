import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://iberi22.github.io',
  base: '/gastronomic-open-standard-GOS',
  output: 'static',
  build: {
    assets: 'assets'
  },
  integrations: [
    tailwind()
  ],
  vite: {
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
        }
      }
    }
  }
});
