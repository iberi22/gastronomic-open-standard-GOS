// verify-sitemap-seo.mjs — medición real sobre dist/ tras `astro build`.
// Tabla única de invariantes: `expect === null` es informativo; si no, un valor
// distinto del esperado falla. Una sola fuente para el reporte y para el exit.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../dist',
)
const SITE = 'https://gos.swal.network'

const html = []
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else if (e.name.endsWith('.html')) html.push(full)
  }
}
walk(dist)

// La URL en disco es UTF-8 plano; el canonical de Astro va percent-encoded.
// decodeURI en ambos lados compara la MISMA URL (encodeURI la doble-codifica).
const sameUrl = (a, b) => {
  const norm = (u) => {
    try {
      return decodeURI(u)
    } catch {
      return u
    }
  }
  return norm(a) === norm(b)
}
// 'index.html' -> '/' ; 'api/index.html' -> '/api/'
const routeOf = (f) =>
  `/${path
    .relative(dist, f)
    .replace(/\\/g, '/')
    .replace(/index\.html$/, '')
    .replace(/\/$/, '')}/`.replace(/\/{2,}/g, '/')

const canonicalBad = []
const langs = new Map()
let hreflangPages = 0
let recipeInstr = 0
let noindexPages = 0

for (const f of html) {
  const h = fs.readFileSync(f, 'utf8')
  if (/hreflang/i.test(h)) hreflangPages++
  if (h.includes('recipeInstructions')) recipeInstr++
  if (/content="noindex/.test(h)) noindexPages++

  const route = routeOf(f)
  const c = h.match(/<link rel="canonical" href="([^"]+)"/)
  // Excepcion: la pagina 404 canoniza al home a proposito. Una pagina de
  // error no debe canonicalizarse a si misma, porque eso la convierte en
  // contenido indexable. routeOf solo normaliza 'index.html', asi que aqui
  // el fichero se llama 404.html y la ruta sale como '/404.html/'.
  const isNotFound = /\/404(\.html)?\/?$/.test(route)
  // El canonical del home lleva barra final y SITE no: hay que comparar
  // contra SITE + '/', no contra SITE a secas.
  const ok =
    c &&
    !/pages\.dev/.test(c[1]) &&
    (isNotFound ? sameUrl(c[1], `${SITE}/`) : sameUrl(c[1], `${SITE}${route}`))
  if (!ok) canonicalBad.push(`${route} -> ${c ? c[1] : 'SIN canonical'}`)

  const l = h.match(/<html[^>]*\slang="([^"]+)"/)?.[1] ?? '(sin lang)'
  langs.set(l, (langs.get(l) ?? 0) + 1)
}

// Cada loc debe existir como fichero real en dist (o sería un 404).
const orphan = (loc) => {
  const p = decodeURI(new URL(loc).pathname)
  const stem = p.replace(/^\/|\/$/g, '')
  return ![`${stem}/index.html`, stem].some((r) =>
    fs.existsSync(path.join(dist, r)),
  )
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8')
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const orphans = locs.filter(orphan)
const noSlash = locs.filter((u) => !u.endsWith('/'))
const notEs = [...langs.entries()].filter(([l]) => l !== 'es')
// El dominio del sitemap se comprueba aparte del canonical del HTML: un
// sitemap entero servido desde gos-site.pages.dev seguiria dando rc=0 porque
// los canonical de cada pagina si son correctos. Control negativo ejecutado:
// sustituir SITE por pages.dev en el sitemap debe dar rc=1.
const smWrongHost = locs.filter((u) => !u.startsWith(`${SITE}/`))

// El sitemap lista solo páginas indexables: las noindex (stubs de
// pending_review) quedan fuera a propósito, luego locs < HTML totales.
const indexable = html.length - noindexPages

// [etiqueta, valor, esperado] — esperado null = solo informativo
const T = [
  ['HTML totales en dist', html.length, null],
  ['Paginas noindex (excluidas del sitemap)', noindexPages, null],
  ['URLs en sitemap = indexables', locs.length, indexable],
  ['URLs unicas', new Set(locs).size, locs.length],
  ['loc de sitemap sin / final', noSlash.length, 0],
  ['Duplicados en sitemap', locs.length - new Set(locs).size, 0],
  ['xhtml:link en sitemap', (sitemap.match(/xhtml:link/gi) || []).length, 0],
  ['loc de sitemap fuera del dominio canonico', smWrongHost.length, 0],
  ['Paginas HTML con hreflang', hreflangPages, 0],
  [
    'Canonical correcto (sin pages.dev)',
    html.length - canonicalBad.length,
    html.length,
  ],
  ['recipeInstructions', recipeInstr, null],
  ['URLs huerfanas (sin fichero en dist)', orphans.length, 0],
  [
    'html lang != es',
    notEs.map(([l, n]) => `${l}=${n}`).join(', ') || '0',
    '0',
  ],
]

const w = Math.max(...T.map(([k]) => k.length))
for (const [k, v] of T) console.log(`  ${k.padEnd(w)} : ${v}`)

const detail = (title, list) =>
  list.length &&
  console.log(
    `\n  ${title}:\n${list
      .slice(0, 10)
      .map((s) => `    ${s}`)
      .join('\n')}`,
  )
detail('Primeras canonical incorrectas', canonicalBad)
detail('Primeras URLs huerfanas', orphans)

const fails = T.filter(([, v, e]) => e !== null && v !== e)
console.log(
  fails.length
    ? `\nFAIL:\n${fails.map(([k, v, e]) => `  - ${k}: ${v} (esperado ${e})`).join('\n')}`
    : '\nOK: todos los invariantes pasan',
)
process.exit(fails.length ? 1 : 0)
