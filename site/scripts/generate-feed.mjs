#!/usr/bin/env node
// site/scripts/generate-feed.mjs
// Generates site/public/feed.json with latest content items (up to 20 per type)
import { readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const CONTENT = join(__dirname, '../src/content')

const COLLECTIONS = [
  'dishes',
  'ingredients',
  'vitamins',
  'conditions',
  'diets',
  'substances',
]

// Recursively find all .md files in a directory tree
async function findMdFiles(dir) {
  const results = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findMdFiles(full)))
    } else if (entry.name.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

function slugToTitle(slug) {
  return slug
    .split('/')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function main() {
  const allItems = []

  for (const col of COLLECTIONS) {
    const colPath = join(CONTENT, col)
    try {
      const files = await findMdFiles(colPath)
      for (const file of files) {
        const rel = file.replace(`${colPath}/`, '').replace('.md', '')
        // Build URL: dishes/colombian/andina/bandeja_paisa -> /recipes/colombian/andina/bandeja_paisa
        const route = col === 'dishes' ? 'recipes' : col
        const url = `https://gos.swal.network/${route}/${rel}`
        const title = slugToTitle(basename(rel))
        allItems.push({ collection: col, slug: rel, url, title })
      }
    } catch (err) {
      // Antes era `catch {}`: un ReferenceError por `basename` no importado
      // dejo el feed entero en 0 items sin dejar rastro. Si la coleccion no
      // existe se avisa, pero el fallo real nunca se traga.
      console.warn(`  [feed] ${col}: ${err.message}`)
    }
  }

  // 20 por coleccion (lo que dice el header del script), no un slice global:
  // dishes tiene 495 .md y se comia las 5 colecciones restantes del feed.
  const PER_COLLECTION = 20
  const feedItems = COLLECTIONS.flatMap((col) =>
    allItems.filter((i) => i.collection === col).slice(0, PER_COLLECTION),
  ).map((item) => ({
    id: item.url,
    url: item.url,
    title: item.title,
    collection: item.collection,
    slug: item.slug,
  }))

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'GOS — Gastronomic Open Standard',
    home_page_url: 'https://gos.swal.network',
    feed_url: 'https://gos.swal.network/feed.json',
    description:
      'Grafo gastronómico global: recetas ↔ ingredientes ↔ vitaminas ↔ sabores ↔ afecciones ↔ dietas ↔ substancias',
    items: feedItems,
  }

  const { writeFile } = await import('node:fs/promises')
  await writeFile(
    join(__dirname, '../public/feed.json'),
    // newline final: sin el, `biome check` falla el formato del JSON
    `${JSON.stringify(feed, null, 2)}\n`,
  )
  console.log(`feed.json: ${feedItems.length} items (${allItems.length} total)`)
}

main().catch(console.error)
