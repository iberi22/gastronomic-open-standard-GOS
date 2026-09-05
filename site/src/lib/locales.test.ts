import { describe, expect, it } from 'vitest'
import { alias, LOCALES, SUPPORTED_LOCALES } from './locales'

describe('locales module', () => {
  it('contains 20 canonical locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(20)
    const expected = [
      'es',
      'en',
      'zh',
      'hi',
      'ar',
      'pt',
      'bn',
      'ru',
      'ja',
      'pa',
      'de',
      'jv',
      'wu',
      'ms',
      'te',
      'vi',
      'ko',
      'fr',
      'ta',
      'ur',
    ]
    for (const code of expected) {
      expect(LOCALES[code]).toBeDefined()
      expect(LOCALES[code].code).toBe(code)
      expect(LOCALES[code].name).toBeTruthy()
      expect(LOCALES[code].hreflang).toBeTruthy()
    }
  })

  it('retrieves aliases correctly with alias() helper', () => {
    const entity = {
      title: 'Ajo',
      aliases: {
        en: ['garlic', 'allium'],
        fr: ['ail'],
      },
    }

    expect(alias(entity, 'en')).toEqual(['garlic', 'allium'])
    expect(alias(entity, 'fr')).toEqual(['ail'])
    expect(alias(entity, 'es')).toEqual([])
    expect(alias(entity, 'ZH')).toEqual([])

    // direct record
    expect(alias(entity.aliases, 'en')).toEqual(['garlic', 'allium'])

    // null / undefined cases
    expect(alias(null, 'en')).toEqual([])
    expect(alias({}, 'en')).toEqual([])
  })
})
