#!/usr/bin/env node
// site/scripts/generate-feed.mjs
// Generates site/public/feed.json with latest content items (up to 20 per type)
import { readdir, readFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONTENT = join(__dirname, '../src/content');

const COLLECTIONS = ['dishes', 'ingredients', 'vitamins', 'conditions', 'diets', 'substances'];

// Recursively find all .md files in a directory tree
async function findMdFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findMdFiles(full)));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

function slugToTitle(slug) {
  return slug.split('/').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function main() {
  const allItems = [];

  for (const col of COLLECTIONS) {
    const colPath = join(CONTENT, col);
    try {
      const files = await findMdFiles(colPath);
      for (const file of files) {
        const rel = file.replace(colPath + '/', '').replace('.md', '');
        // Build URL: dishes/colombian/andina/bandeja_paisa -> /recipes/colombian/andina/bandeja_paisa
        const route = col === 'dishes' ? 'recipes' : col;
        const url = `https://gos-site.pages.dev/${route}/${rel}`;
        const title = slugToTitle(basename(rel));
        allItems.push({ collection: col, slug: rel, url, title });
      }
    } catch {
      // Collection doesn't exist
    }
  }

  const feedItems = allItems.slice(0, 50).map(item => ({
    id: item.url,
    url: item.url,
    title: item.title,
    collection: item.collection,
    slug: item.slug,
  }));

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'GOS — Gastronomic Open Standard',
    home_page_url: 'https://gos-site.pages.dev',
    feed_url: 'https://gos-site.pages.dev/feed.json',
    description: 'Grafo gastronómico global: recetas ↔ ingredientes ↔ vitaminas ↔ sabores ↔ afecciones ↔ dietas ↔ substancias',
    items: feedItems,
  };

  const { writeFile } = await import('fs/promises');
  await writeFile(join(__dirname, '../public/feed.json'), JSON.stringify(feed, null, 2));
  console.log(`feed.json: ${feedItems.length} items (${allItems.length} total)`);
}

main().catch(console.error);
