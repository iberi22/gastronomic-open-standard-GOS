import { describe, expect, it } from 'vitest'
import { translateEntity } from './translateService'

describe('translateService', () => {
  it('returns translations for a known ingredient entity and locale', async () => {
    const res = await translateEntity({ entity: 'ajo', locale: 'en' })
    expect(res).not.toHaveProperty('error')
    expect(res.count).toBeGreaterThan(0)
    const garlic = res.results.find((r) => r.id.includes('ajo'))
    expect(garlic).toBeDefined()
    expect(garlic?.name).toBeTruthy()
    expect(garlic?.aliases).toContain('garlic')
  })

  it('returns error for invalid locale', async () => {
    const res = await translateEntity({ entity: 'ajo', locale: 'invalid' })
    expect(res).toHaveProperty('error')
    expect(res.error).toContain('Unsupported locale')
  })

  it('returns all supported locales when no locale is provided', async () => {
    const res = await translateEntity({ entity: 'alicina' })
    expect(res.supported_locales).toHaveLength(20)
    expect(res.count).toBeGreaterThan(0)
  })
})
