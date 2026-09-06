// generate-sitemap.js — site/public/sitemap.xml con TODAS las rutas reales
// (estaticas + recipes/ingredients/substances/countries). Sin muestreos,
// sin colecciones sin ruta (/vitamins, /conditions, /diets, /tips no existen
// como paginas: listarlas generaba 404 en el sitemap).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SITE = process.env.SITE_ORIGIN || 'https://gos-site.pages.dev'
const publicDir = path.resolve(__dirname, '../public')
const contentDir = path.resolve(__dirname, '../src/content')

// OJO: corre tras copy-content.js (el contenido vive en src/content)
function collectMd(base) {
  if (!fs.existsSync(base)) return []
  const out = []
  function walk(dir, rel) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name)
      const r = rel ? `${rel}/${ent.name}` : ent.name
      if (ent.isDirectory()) walk(full, r)
      else if (ent.name.endsWith('.md') && ent.name !== 'placeholder.md') {
        // Astro minusculiza los ids (README.md -> .../readme): espejarlo
        // para que el sitemap no liste URLs 404.
        out.push(r.replace(/\.md$/, '').replace(/\/README$/, '/readme'))
      }
    }
  }
  walk(base, '')
  return out
}

const urls = []
const add = (loc, priority) => urls.push({ loc: `${SITE}${loc}`, priority })

// paginas estaticas (rutas verificadas en src/pages)
for (const p of [
  '/',
  '/graph',
  '/recipes',
  '/ingredients',
  '/scientific',
  '/substances',
  '/countries',
  '/api',
]) {
  add(p, p === '/' ? '1.0' : '0.8')
}

// substances (30)
for (const id of collectMd(path.join(contentDir, 'substances')))
  add(`/substances/${id}`, '0.7')

// ingredients (todos, con subdirectorios)
for (const id of collectMd(path.join(contentDir, 'ingredients')))
  add(`/ingredients/${id}`, '0.6')

// recipes = coleccion dishes (todos, con subdirectorios pais/plato)
const dishIds = collectMd(path.join(contentDir, 'dishes'))
for (const id of dishIds) add(`/recipes/${id}`, '0.6')

// countries = primer segmento de dishes (igual que [country].astro)
const countries = [...new Set(dishIds.map((id) => id.split('/')[0]))]
for (const c of countries) add(`/countries/${c}`, '0.6')

const seen = new Set()
const deduped = urls.filter((u) => !seen.has(u.loc) && seen.add(u.loc))
deduped.sort((a, b) => a.loc.localeCompare(b.loc))

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${deduped
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <xhtml:link rel="alternate" hreflang="es" href="${u.loc}" />
    <xhtml:link rel="alternate" hreflang="en" href="${u.loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${u.loc}" />
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

fs.mkdirSync(publicDir, { recursive: true })
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf8')
console.log(`sitemap.xml generated with ${deduped.length} URLs (hreflang enabled)`)
