import { describe, expect, it } from 'vitest'
import {
  INGREDIENT_OG_PLACEHOLDER,
  INGREDIENT_PLACEHOLDER,
  isValidImageUrl,
  OG_DEFAULT,
  ogMeta,
  RECIPE_OG_PLACEHOLDER,
  RECIPE_PLACEHOLDER,
  resolveDishHero,
  resolveIngredientHero,
  resolveOgImage,
} from './images'

const LOCAL_MAP: Record<string, string> = {
  'colombian/andina/bandeja_paisa/bandeja_paisa':
    '/dishes/colombian/andina/bandeja_paisa/images/3.webp',
}

describe('isValidImageUrl', () => {
  it('acepta http(s) con extensión de imagen', () => {
    expect(isValidImageUrl('https://www.misrecetas.com/fotos/x.jpg')).toBe(true)
    expect(isValidImageUrl('http://x.com/a.PNG?v=1')).toBe(true)
  })
  it('acepta Unsplash por ID aunque no tenga extensión', () => {
    expect(
      isValidImageUrl(
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      ),
    ).toBe(true)
  })
  it('rechaza basura medida del contenido', () => {
    expect(isValidImageUrl('pending')).toBe(false)
    expect(isValidImageUrl('>-')).toBe(false)
    expect(isValidImageUrl('https://www.recetaschilenas.cl/')).toBe(false)
    expect(isValidImageUrl('https://www.recetasargentinas.net/')).toBe(false)
    expect(isValidImageUrl('./images/1.png')).toBe(false)
    expect(isValidImageUrl(undefined)).toBe(false)
    expect(isValidImageUrl('')).toBe(false)
  })
  it('acepta rutas locales /dishes e imágenes con extensión', () => {
    expect(isValidImageUrl('/dishes/colombian/andina/x/images/1.webp')).toBe(
      true,
    )
    expect(isValidImageUrl('/images/placeholders/recipe.svg')).toBe(true)
  })
})

describe('resolveDishHero', () => {
  it('prioriza images[0] válido', () => {
    expect(
      resolveDishHero(
        {
          images: [{ url: 'https://x.com/a.jpg' }],
          image: 'https://x.com/b.jpg',
        },
        'z',
        LOCAL_MAP,
      ),
    ).toBe('https://x.com/a.jpg')
  })
  it('salta basura y usa image singular', () => {
    expect(
      resolveDishHero(
        { images: [{ url: 'pending' }], image: 'https://x.com/b.jpg' },
        'z',
        LOCAL_MAP,
      ),
    ).toBe('https://x.com/b.jpg')
  })
  it('usa foto local mapeada cuando el frontmatter no sirve', () => {
    expect(
      resolveDishHero(
        { images: [{ url: 'pending' }] },
        'colombian/andina/bandeja_paisa/bandeja_paisa',
        LOCAL_MAP,
      ),
    ).toBe('/dishes/colombian/andina/bandeja_paisa/images/3.webp')
  })
  it('cae al placeholder sin nada válido', () => {
    expect(resolveDishHero({ images: [{ url: 'pending' }] }, 'x', {})).toBe(
      RECIPE_PLACEHOLDER,
    )
    expect(resolveDishHero(null, 'x', {})).toBe(RECIPE_PLACEHOLDER)
  })
})

describe('resolveIngredientHero', () => {
  it('usa image válida o placeholder', () => {
    expect(resolveIngredientHero({ image: 'https://x.com/a.webp' })).toBe(
      'https://x.com/a.webp',
    )
    expect(resolveIngredientHero({})).toBe(INGREDIENT_PLACEHOLDER)
    expect(resolveIngredientHero(null)).toBe(INGREDIENT_PLACEHOLDER)
  })
})

// Regresión: 735/1104 paginas medían og:image en SVG (Google no lo acepta).
describe('resolveOgImage', () => {
  it('deja intacta cualquier imagen raster', () => {
    for (const raster of [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      'https://images.unsplash.com/photo-1544025162-d76694265947',
      'https://www.misrecetas.com/fotos/x.jpg',
      '/dishes/colombian/andina/bandeja_paisa/images/3.webp',
    ]) {
      expect(resolveOgImage(raster)).toBe(raster)
    }
  })
  it('mapea cada SVG local a su PNG de 1200x630', () => {
    expect(resolveOgImage(RECIPE_PLACEHOLDER)).toBe(RECIPE_OG_PLACEHOLDER)
    expect(resolveOgImage(INGREDIENT_PLACEHOLDER)).toBe(
      INGREDIENT_OG_PLACEHOLDER,
    )
    expect(resolveOgImage('/favicon.svg')).toBe(OG_DEFAULT)
  })
  it('cae al default PNG cuando no hay imagen o el SVG no tiene contraparte', () => {
    for (const input of [
      undefined,
      null,
      '',
      '   ',
      'https://cdn.otro-sitio.com/logo.svg',
      '/sin-extension.svg?v=2',
    ]) {
      expect(resolveOgImage(input)).toBe(OG_DEFAULT)
    }
  })
  it('toda salida es raster (nunca .svg)', () => {
    const inputs = [
      RECIPE_PLACEHOLDER,
      INGREDIENT_PLACEHOLDER,
      '/favicon.svg',
      undefined,
      'https://x.com/a.png',
      'https://x.com/a.webp',
    ]
    for (const input of inputs) {
      expect(resolveOgImage(input)).not.toMatch(/\.svg(\?|#|$)/i)
    }
  })
})

const ORIGIN = 'https://gos.swal.network'

describe('ogMeta', () => {
  it('absolutiza rutas locales y declara 1200x630 solo si las sabemos', () => {
    expect(ogMeta(undefined, ORIGIN)).toEqual({
      url: `${ORIGIN}/og-default.png`,
      type: 'image/png',
      width: 1200,
      height: 630,
    })
    expect(ogMeta(RECIPE_PLACEHOLDER, ORIGIN)).toEqual({
      url: `${ORIGIN}/images/placeholders/recipe-og.png`,
      type: 'image/png',
      width: 1200,
      height: 630,
    })
  })
  it('deja intactas las remotas y no inventa sus dimensiones', () => {
    for (const remote of [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      'https://www.misrecetas.com/fotos/x.jpg',
      '/dishes/colombian/andina/x/images/3.webp',
    ]) {
      const meta = ogMeta(remote, ORIGIN)
      expect(meta.url).toBe(
        remote.startsWith('/') ? `${ORIGIN}${remote}` : remote,
      )
      expect(meta.width).toBeUndefined()
      expect(meta.height).toBeUndefined()
    }
    expect(ogMeta('/dishes/a/images/3.webp', ORIGIN).type).toBe('image/webp')
  })
  it('deduce el mime de unsplash (jpg salvo fm=png)', () => {
    expect(ogMeta('https://images.unsplash.com/photo-1', ORIGIN).type).toBe(
      'image/jpeg',
    )
    expect(
      ogMeta('https://images.unsplash.com/photo-1?fm=png', ORIGIN).type,
    ).toBe('image/png')
  })
})
