import { describe, expect, it } from 'vitest'
import { type CatalogItem, translateEntity } from './translateService'

// Fixture sin astro:content (no resoluble en vitest). El endpoint real
// construye el catálogo con buildCatalog + getCollection.
const catalog: CatalogItem[] = [
  {
    id: 'ajo',
    type: 'ingredient',
    name: 'Ajo',
    aliases: { en: ['garlic'], pt: ['alho'] },
  },
  {
    id: 'alicina',
    type: 'substance',
    name: 'Alicina',
    aliases: { en: ['allicin'] },
  },
]

describe('translateService', () => {
  it('returns translations for a known ingredient entity and locale', () => {
    const res = translateEntity({ entity: 'ajo', locale: 'en' }, catalog)
    expect(res).not.toHaveProperty('error')
    expect(res.count).toBeGreaterThan(0)
    const garlic = res.results.find((r) => r.id.includes('ajo'))
    expect(garlic).toBeDefined()
    expect(garlic?.name).toBeTruthy()
    expect(garlic?.aliases).toContain('garlic')
  })

  it('returns error for invalid locale', () => {
    const res = translateEntity({ entity: 'ajo', locale: 'invalid' }, catalog)
    expect(res).toHaveProperty('error')
    expect(res.error).toContain('Unsupported locale')
  })

  it('returns all supported locales when no locale is provided', () => {
    const res = translateEntity({ entity: 'alicina' }, catalog)
    expect(res.supported_locales).toHaveLength(20)
    expect(res.count).toBeGreaterThan(0)
  })
})
