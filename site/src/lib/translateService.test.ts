import { describe, expect, it } from 'vitest'
import { type CatalogItem, translateEntity } from './translateService'

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
  it('returns translations for a known ingredient entity and locale (200 + payload)', () => {
    const res = translateEntity({ entity: 'ajo', locale: 'en' }, catalog)
    expect(res).not.toHaveProperty('error')
    if ('count' in res) {
      expect(res.count).toBeGreaterThan(0)
      const garlic = res.results.find((r) => r.id.includes('ajo'))
      expect(garlic).toBeDefined()
      expect(garlic?.name).toBeTruthy()
      expect(garlic?.aliases).toContain('garlic')
    } else {
      expect.fail('Expected successful response format')
    }
  })

  it('unknown entity (404 with a clear message)', () => {
    const res = translateEntity({ entity: 'unknown123' }, catalog)
    expect(res).toHaveProperty('error')
    if ('error' in res) {
      expect(res.error).toBe("Entity 'unknown123' not found")
      expect(res.status).toBe(404)
    }
  })

  it('empty or invalid query (400)', () => {
    const res = translateEntity({ entity: 'ajo', locale: 'invalid' }, catalog)
    expect(res).toHaveProperty('error')
    if ('error' in res) {
      expect(res.error).toContain('Unsupported locale')
      expect(res.status).toBe(400)
    }
  })

  it('empty or invalid query (400) - no entity provided but locale provided', () => {
    const res = translateEntity({ locale: 'en' }, catalog)
    expect(res).toHaveProperty('error')
    if ('error' in res) {
      expect(res.error).toBe('Empty or invalid query')
      expect(res.status).toBe(400)
    }
  })

  it('a language pair with no entry returns empty valid structure', () => {
    const res = translateEntity({ entity: 'alicina', locale: 'pt' }, catalog)
    expect(res).not.toHaveProperty('error')
    if ('count' in res) {
      expect(res.count).toBe(1)
      expect(res.results[0].aliases).toHaveLength(0)
    }
  })

  it('returns all supported locales when no locale is provided', () => {
    const res = translateEntity({ entity: 'alicina' }, catalog)
    expect(res).not.toHaveProperty('error')
    if ('supported_locales' in res) {
      expect(res.supported_locales).toHaveLength(22)
    }
    if ('count' in res) {
      expect(res.count).toBeGreaterThan(0)
    }
  })

  it('type filtering works', () => {
    const res = translateEntity({ entity: 'alicina', type: 'ingredient' }, catalog)
    expect(res).toHaveProperty('error')
    if ('error' in res) {
      expect(res.status).toBe(404)
    }
  })
})
