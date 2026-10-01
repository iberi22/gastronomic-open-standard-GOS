// site/scripts/generate-og-images.mjs
//
// Rasteriza las imagenes Open Graph del sitio. Google NO acepta SVG en
// og:image / twitter:image: las usa los crawlers sociales (Slack, WhatsApp,
// Twitter) y las descarta, dejando la tarjeta sin preview. Medido sobre
// dist/ antes del cambio: 735/1104 paginas emitian og:image .svg
//   609 -> https://gos.swal.network/favicon.svg        (defaultImage en Layout.astro)
//   126 -> https://gos.swal.network/images/placeholders/recipe.svg
// y solo 369 emitian raster.
//
// Este script produce 3 PNG de 1200x630 (tamano que espera Open Graph):
//   public/og-default.png                     -> default global del sitio
//   public/images/placeholders/recipe-og.png  -> fallback de paginas de receta
//   public/images/placeholders/ingredient-og.png -> fallback de ingredientes
//
// Usa sharp, que YA es dependencia del paquete site (scripts/generate-icons.cjs
// y scripts/generate-substance-images.cjs lo usan igual). No se anade ninguna
// dependencia nueva ni se invoca ImageMagick.

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.join(import.meta.dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const PLACEHOLDERS = path.join(PUBLIC, 'images', 'placeholders')

const W = 1200
const H = 630

const INK = '#f5f3ef'
const MUTED = '#a8a29e'
const ACCENT = '#8b5cf6'
const CYAN = '#06b6d4'

/** common defs: gradients + glow filter reused by every card. */
const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="55%" stop-color="#141226"/>
      <stop offset="100%" stop-color="#1d1030"/>
    </linearGradient>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${ACCENT}"/>
      <stop offset="100%" stop-color="${CYAN}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>`

/** The GOS knowledge-graph motif: nodes + edges, same language as /graph. */
function graph(x, y, scale, opacity = 1) {
  const edges = [
    [0, 0, 150, -78],
    [0, 0, 178, 26],
    [0, 0, 116, 122],
    [150, -78, 178, 26],
    [150, -78, 252, -34],
    [178, 26, 252, -34],
    [116, 122, 178, 26],
  ]
  const nodes = [
    [0, 0, 30, 'url(#brand)'],
    [150, -78, 19, CYAN],
    [178, 26, 22, ACCENT],
    [116, 122, 16, CYAN],
    [252, -34, 13, MUTED],
  ]
  return `<g opacity="${opacity}">
    ${edges
      .map(
        ([a, b, c, d]) =>
          `<line x1="${x + a * scale}" y1="${y + b * scale}" x2="${x + c * scale}" y2="${y + d * scale}" stroke="${INK}" stroke-opacity="0.22" stroke-width="1.6"/>`,
      )
      .join('')}
    ${nodes
      .map(
        ([a, b, r, fill]) =>
          `<circle cx="${x + a * scale}" cy="${y + b * scale}" r="${r * scale}" fill="${fill}"/>`,
      )
      .join('')}
  </g>`
}

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs}
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="1000" cy="120" r="330" fill="url(#glow)" filter="url(#soft)"/>
<circle cx="180" cy="620" r="260" fill="url(#glow)" filter="url(#soft)" opacity="0.6"/>
${inner}
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${INK}" stroke-opacity="0.10" stroke-width="1"/>
</svg>`
}

const wordmark = (title, subtitle, tag) => `
<g font-family="Inter, 'DejaVu Sans', system-ui, sans-serif">
  <text x="88" y="196" fill="url(#brand)" font-size="118" font-weight="800" letter-spacing="-3">${title}</text>
  <text x="92" y="256" fill="${MUTED}" font-size="30" font-weight="600" letter-spacing="7">${subtitle}</text>
  <line x1="88" y1="308" x2="288" y2="308" stroke="url(#brand)" stroke-width="5"/>
  <text x="92" y="378" fill="${INK}" font-size="34" font-weight="500">${tag}</text>
</g>`

const footer = (note) => `
<g font-family="Inter, 'DejaVu Sans', system-ui, sans-serif">
  <text x="88" y="${H - 58}" fill="${MUTED}" font-size="23" font-weight="500">${note}</text>
  <text x="${W - 88}" y="${H - 58}" fill="${INK}" fill-opacity="0.45" font-size="23" font-weight="600" text-anchor="end">gos.swal.network</text>
</g>`

const CARDS = [
  {
    out: path.join(PUBLIC, 'og-default.png'),
    label: 'og-default.png',
    svg: frame(
      `${graph(880, 300, 1.5, 0.95)}
       ${wordmark(
         'GOS',
         'GASTRONOMIC OPEN STANDARD',
         'Grafo abierto: recetas, ingredientes, vitaminas,',
       )}
       <text x="92" y="424" fill="${INK}" font-size="34" font-weight="500">sabores, afecciones, dietas y sustancias.</text>
       ${footer('Estandar abierto de datos gastronomicos')}`,
    ),
  },
  {
    out: path.join(PLACEHOLDERS, 'recipe-og.png'),
    label: 'images/placeholders/recipe-og.png',
    svg: frame(
      `${graph(900, 320, 1.1, 0.8)}
       ${wordmark('Receta', 'GOS · RECIPE', 'Documento de receta en el grafo')}
       <g font-family="Inter, 'DejaVu Sans', system-ui, sans-serif">
         <text x="92" y="424" fill="${MUTED}" font-size="28" font-weight="500">Imagen pendiente del pipeline de contenido.</text>
       </g>
       ${footer('Gastronomic Open Standard')}`,
    ),
  },
  {
    out: path.join(PLACEHOLDERS, 'ingredient-og.png'),
    label: 'images/placeholders/ingredient-og.png',
    svg: frame(
      `${graph(900, 320, 1.1, 0.8)}
       ${wordmark('Ingrediente', 'GOS · INGREDIENT', 'Ficha de ingrediente en el grafo')}
       <g font-family="Inter, 'DejaVu Sans', system-ui, sans-serif">
         <text x="92" y="424" fill="${MUTED}" font-size="28" font-weight="500">Imagen pendiente del pipeline de contenido.</text>
       </g>
       ${footer('Gastronomic Open Standard')}`,
    ),
  },
]

fs.mkdirSync(PLACEHOLDERS, { recursive: true })

await Promise.all(
  CARDS.map(({ out, label, svg }) =>
    sharp(Buffer.from(svg))
      .resize(W, H)
      .png({ compressionLevel: 9 })
      .toFile(out)
      .then(() => console.log(`  ok  ${label}`))
      .catch((err) => {
        console.error(`  FAIL ${label}: ${err.message}`)
        process.exitCode = 1
      }),
  ),
)
