// site/src/lib/recipe-markdown.ts — lee el markdown crudo de una receta.
//
// Necesario para recipeInstructions: Astro da el frontmatter ya parseado
// (data) y el cuerpo via render(), pero no el markdown original con la
// seccion "## Instrucciones" tal cual. El JSON-LD se construye en el
// frontmatter de la pagina, antes de render(), asi que hace falta el texto.
//
// La collection se define con glob base './src/content/dishes' (495 md), NO
// con el dishes/ de la raiz del repo (613 md, con duplicados e indices). El
// id de la collection ya incluye la ruta regional anidada
// ('colombian/amazonia/aji_negro/aji_negro'), asi que basta con unirlo al base.

import { readFile } from 'node:fs/promises'
import path from 'node:path'

// La ruta NO puede derivarse de import.meta.url: Vite reescribe ese valor
// al chunk compilado durante el build, y el file:// resultante no existe
// (medido 2026-10-01: 495/495 recetas con md=0 aunque el archivo estaba ahi).
// Se resuelve desde process.cwd(), que durante `astro build` es la raiz del
// paquete site/ (donde vive package.json).
const DISHES_DIR = path.resolve(process.cwd(), 'src/content/dishes')

const cache = new Map<string, string>()

/**
 * Devuelve el markdown crudo de la receta, o '' si no existe.
 * Cachea por id: el build lee cada receta una vez.
 */
export async function getRecipeMarkdown(slug: string): Promise<string> {
  const cached = cache.get(slug)
  if (cached !== undefined) return cached

  // El id puede venir como ruta ('colombian/amazonia/aji_negro/aji_negro')
  // o como nombre simple. Se prueban ambas formas contra la collection.
  const base = path.basename(slug)
  const candidates = slug.includes('/') ? [slug, base] : [base, slug]

  let found = ''
  for (const rel of candidates) {
    // el id viene de la ruta de la pagina: impedir path traversal
    const safe = rel.replace(/\.\./g, '').replace(/^\/+/, '')
    const file = path.join(DISHES_DIR, `${safe}.md`)
    if (!file.startsWith(DISHES_DIR + path.sep)) continue
    try {
      found = await readFile(file, 'utf-8')
      break
    } catch {
      // siguiente candidato
    }
  }

  cache.set(slug, found)
  return found
}
