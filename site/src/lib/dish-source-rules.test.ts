// @vitest-environment node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { dishSourceSchema } from './dish-source-rules'

const dishFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../content/dishes/china/principales/mapo-doufu.md',
)

describe('dishSourceSchema', () => {
  const parsed = matter(readFileSync(dishFile, 'utf8')).data

  it('acepta la ficha real de mapo doufu', () => {
    expect(parsed.source.url).toBe('https://www.xiachufang.com/recipe/1000182/')
    expect(dishSourceSchema.safeParse(parsed).success).toBe(true)
  })

  it('rechaza source.url pending sobre una copia de esa ficha', () => {
    const copy = structuredClone(parsed)
    copy.source.url = 'pending'
    expect(dishSourceSchema.safeParse(copy).success).toBe(false)
  })

  it('rechaza una imagen que es la homepage de un sitio', () => {
    const copy = structuredClone(parsed)
    copy.image = 'https://en.wikipedia.org/'
    expect(dishSourceSchema.safeParse(copy).success).toBe(false)
  })

  it('rechaza pending en cualquier caso y un url vacío si source está', () => {
    for (const url of ['PENDING', ' Pending ', '', '   ']) {
      const copy = structuredClone(parsed)
      copy.source.url = url
      expect(dishSourceSchema.safeParse(copy).success, url).toBe(false)
    }
  })

  it('permite un artículo de Wikipedia, una ruta relativa y la raíz en images[] no', () => {
    const article = structuredClone(parsed)
    article.image = 'https://en.wikipedia.org/wiki/Mapo_tofu'
    expect(dishSourceSchema.safeParse(article).success).toBe(true)

    const relative = structuredClone(parsed)
    relative.image = '/dishes/colombia/x.webp'
    expect(dishSourceSchema.safeParse(relative).success).toBe(true)

    const gallery = structuredClone(parsed)
    gallery.images = [{ url: 'https://en.wikipedia.org/' }]
    expect(dishSourceSchema.safeParse(gallery).success).toBe(false)
  })
})
