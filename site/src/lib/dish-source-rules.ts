// Reglas de source.url e imagen que no pueden vivir en content.config.ts.
// Ese schema es el que carga la colección Astro, y muchos platos ya
// publicados (francés, tailandés y otros) traen `url: pending`. Enganchar
// esto ahí rompe el sitio. El gate vive aparte y se prueba contra una ficha
// real.

import { z } from 'astro/zod'

/** `pending` en cualquier caso, o vacío, tras recortar espacios. */
function isPendingOrBlank(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length === 0 || trimmed.toLowerCase() === 'pending'
}

/**
 * URL absoluta http(s) cuya ruta es la raíz del sitio (`/` o vacía).
 * Un artículo (`/wiki/Mapo_tofu`) y una ruta relativa (`/dishes/...`) no
 * entran aquí.
 */
function isSiteHomepage(value: string): boolean {
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    return url.pathname === '/' || url.pathname === ''
  } catch {
    return false
  }
}

const sourceUrl = z.string().refine((value) => !isPendingOrBlank(value), {
  message: 'source.url must be a real URL, not pending or blank',
})

const imageUrl = z.string().refine((value) => !isSiteHomepage(value), {
  message: 'image URL must not be a site homepage',
})

export const dishSourceSchema = z
  .object({
    source: z
      .object({
        url: sourceUrl,
      })
      .passthrough()
      .optional(),
    image: imageUrl.optional(),
    images: z
      .array(
        z
          .object({
            url: imageUrl.optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()
