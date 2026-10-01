// site/src/lib/images.ts — resolución de imagen hero para recetas e ingredientes.
//
// Realidad del contenido (medida 2026-09-07, no supuesta):
// - dishes.images[].url trae basura frecuente: "pending" (311), homepages
//   (recetaschilenas.cl), artefactos YAML (">-") y rutas relativas rotas.
// - Solo 16 fotos locales reales en public/dishes (ver src/data/dish-images.json).
// - 0/552 ingredientes tienen imagen: todos caen al placeholder hasta que el
//   pipeline de contenido las genere (gap anotado, no inventamos fotos).
export const RECIPE_PLACEHOLDER = '/images/placeholders/recipe.svg'
export const INGREDIENT_PLACEHOLDER = '/images/placeholders/ingredient.svg'

// ---------------------------------------------------------------------------
// og:image — Google y los crawlers sociales NO aceptan SVG. Medido sobre
// dist/ antes del cambio: 735/1104 paginas emitian og:image en SVG
// (609 favicon.svg + 126 recipe.svg) y solo 369 en raster. Estos PNG de
// 1200x630 los produce scripts/generate-og-images.mjs con sharp.
// Los <img> del hero siguen usando los SVG: el navegador los renderiza bien,
// el problema es solo el tag social.
// ---------------------------------------------------------------------------
export const OG_DEFAULT = '/og-default.png'
export const RECIPE_OG_PLACEHOLDER = '/images/placeholders/recipe-og.png'
export const INGREDIENT_OG_PLACEHOLDER =
  '/images/placeholders/ingredient-og.png'

/** Equivalente raster de cada SVG que el sitio usaba como og:image. */
const SVG_TO_OG: Record<string, string> = {
  [RECIPE_PLACEHOLDER]: RECIPE_OG_PLACEHOLDER,
  [INGREDIENT_PLACEHOLDER]: INGREDIENT_OG_PLACEHOLDER,
  '/favicon.svg': OG_DEFAULT,
}

/** Tamano real de los PNG que emite este repo (los 3 los genera sharp). */
const OG_LOCAL_SIZE: Record<string, { w: number; h: number }> = {
  [OG_DEFAULT]: { w: 1200, h: 630 },
  [RECIPE_OG_PLACEHOLDER]: { w: 1200, h: 630 },
  [INGREDIENT_OG_PLACEHOLDER]: { w: 1200, h: 630 },
}

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
}

/**
 * Normaliza la imagen que se emite en og:image / twitter:image a un formato
 * raster que los crawlers sociales aceptan:
 *   1. imagen raster válida (jpg/png/webp/avif/gif) -> se respeta tal cual
 *   2. SVG con equivalente raster local        -> se usa el PNG
 *   3. SVG sin equivalente (p.ej. remota)      -> cae al default PNG
 *   4. sin imagen                               -> cae al default PNG
 */
export function resolveOgImage(image?: string | null): string {
  const raw = typeof image === 'string' ? image.trim() : ''
  if (!raw) return OG_DEFAULT

  const path = raw.split(/[?#]/)[0]
  if (/\.svg$/i.test(path)) {
    if (raw.startsWith('/')) return SVG_TO_OG[raw] ?? OG_DEFAULT
    // SVG remota: no hay contraparte local, el default es lo unico raster.
    return OG_DEFAULT
  }
  return raw
}

export interface OgMeta {
  /** URL absoluta, lista para el meta. */
  url: string
  type: string
  /** Solo para los PNG locales de 1200x630 que sabemos medir: una URL
   *  remota no tiene ancho conocido y declararlo seria mentir. */
  width?: number
  height?: number
}

/** Todo lo que el <head> necesita del og:image, en una sola llamada. */
export function ogMeta(
  image: string | null | undefined,
  origin: string,
): OgMeta {
  const og = resolveOgImage(image)
  const ext = (
    og.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1] ?? ''
  ).toLowerCase()
  // Unsplash sirve jpg salvo que se pida fm=png.
  const type =
    MIME[ext] ??
    (og.includes('images.unsplash.com') && !og.includes('fm=png')
      ? 'image/jpeg'
      : 'image/png')
  const size = og.startsWith('/') ? OG_LOCAL_SIZE[og] : undefined
  return {
    url: og.startsWith('http') ? og : `${origin}${og}`,
    type,
    width: size?.w,
    height: size?.h,
  }
}

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/i

/** ¿URL utilizable como <img>? Filtra "pending", homepages y rutas rotas. */
export function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  const u = url.trim().replace(/^['"]|['"]$/g, '')
  if (!u || u === 'pending' || u === '>-' || u === '-') return false
  if (u.startsWith('/')) return IMAGE_EXT.test(u) || u.includes('/dishes/')
  if (/^https?:\/\//i.test(u)) {
    // Unsplash por ID de foto (sin extensión) o cualquier URL con ext. imagen.
    // Se rechazan homepages (https://sitio.cl/) y thumbs de otros sitios.
    if (IMAGE_EXT.test(u)) return true
    if (/images\.unsplash\.com\/photo-\d+/.test(u)) return true
    return false
  }
  return false
}

export interface DishImageEntry {
  url?: string
  description?: string
}

export interface DishHeroInput {
  images?: DishImageEntry[]
  image?: string
}

/**
 * Cadena de resolución hero de receta (primero válido gana):
 * 1. images[].url válido  2. image singular válido
 * 3. foto local mapeada (dish-images.json)  4. placeholder.
 */
export function resolveDishHero(
  data: DishHeroInput | null | undefined,
  dishId: string,
  localMap: Record<string, string>,
): string {
  const cands: unknown[] = []
  if (Array.isArray(data?.images)) {
    for (const im of data.images) cands.push(im?.url)
  }
  cands.push(data?.image)
  cands.push(localMap[dishId])
  for (const c of cands) {
    if (isValidImageUrl(c))
      return (c as string).trim().replace(/^['"]|['"]$/g, '')
  }
  return RECIPE_PLACEHOLDER
}

/** Hero de ingrediente: image válida o placeholder (pipeline pendiente). */
export function resolveIngredientHero(
  data: { image?: string } | null | undefined,
): string {
  if (isValidImageUrl(data?.image)) {
    return (data as { image: string }).image.trim().replace(/^['"]|['"]$/g, '')
  }
  return INGREDIENT_PLACEHOLDER
}
