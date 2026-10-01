// site/src/lib/recipe-markdown.ts — lee el markdown crudo de una receta.
//
// Para recipeInstructions: Astro entrega el frontmatter parseado (data) y el
// cuerpo via render(), nunca el markdown original. El JSON-LD se construye
// antes de render(), asi que hay que leer el archivo.
//
// Base = './src/content/dishes' (495 md anidados, segun content.config.ts),
// NO dishes/ de la raiz del repo (613 md, con duplicados e indices).

import { readFile } from 'node:fs/promises'
import path from 'node:path'

// import.meta.url no sirve: Vite lo reescribe al chunk compilado y el file://
// resultante no existe (2026-10-01: 495/495 con md=0). cwd() es site/ en build.
const DISHES_DIR = path.resolve(process.cwd(), 'src/content/dishes')

const cache = new Map<string, string>()

/** Markdown crudo de la receta, o '' si no existe. Cachea por id. */
export async function getRecipeMarkdown(slug: string): Promise<string> {
  const cached = cache.get(slug)
  if (cached !== undefined) return cached

  // entry.id trae la ruta anidada; path.basename es el plan B para ids planos.
  const found = await read(path.basename(slug)).then((md) => md || read(slug))
  cache.set(slug, found)
  return found
}

async function read(rel: string): Promise<string> {
  // el id viene de la ruta de la pagina: impedir path traversal
  const file = path.join(
    DISHES_DIR,
    `${rel.replace(/\.\./g, '').replace(/^\/+/, '')}.md`,
  )
  if (!file.startsWith(DISHES_DIR + path.sep)) return ''
  try {
    return await readFile(file, 'utf-8')
  } catch {
    return ''
  }
}
