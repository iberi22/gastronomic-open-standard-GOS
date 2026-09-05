import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test.describe('Top 20 Worldwide Catalog Verification', () => {
  test('catalog.json exists and contains required country recipe counts', async () => {
    const catalogPath = path.resolve(
      process.cwd(),
      'public/api/by-country/catalog.json',
    )
    expect(fs.existsSync(catalogPath)).toBe(true)

    const content = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
    expect(Array.isArray(content)).toBe(true)

    const requiredCountries = [
      'mexican',
      'japanese',
      'italian',
      'indian',
      'french',
      'thai',
      'spanish',
      'american',
      'moroccan',
      'greek',
    ]

    for (const country of requiredCountries) {
      const entry = content.find(
        (c: { country: string; count: number; recipes: unknown[] }) =>
          c.country === country,
      )
      expect(entry).toBeDefined()
      expect(entry.count).toBe(20)
      expect(entry.recipes.length).toBe(20)
    }
  })
})
