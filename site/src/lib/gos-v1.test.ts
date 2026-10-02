// @vitest-environment node

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// The exporter is a Node ESM script shared with the build.
import {
  buildDataset,
  dishRecord,
  exportDataset,
  ingredientRecord,
  parseQuantity,
  validateDataset,
} from '../../../scripts/export-v1.mjs'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)
const ingredient = ingredientRecord(
  {
    name: 'Maíz',
    aliases: { en: ['corn'] },
    nutrition_per_100g: { calories: 100, protein_g: 10 },
    micronutrients: { potassium_mg: 20 },
  },
  'grains/maiz.md',
)
const dataset = buildDataset({ generatedAt: '2026-10-02T00:00:00.000Z' })

describe('GOS v1 published contract', () => {
  it('validates every published ingredient and dish, plus the manifest', () => {
    expect(() => validateDataset(dataset)).not.toThrow()
    for (const kind of ['ingredients', 'dishes'] as const) {
      const files = fs
        .readdirSync(path.join(repoRoot, 'site/src/content', kind), {
          recursive: true,
        })
        .filter((f) => String(f).endsWith('.md'))
      expect(dataset[kind]).toHaveLength(files.length)
      expect(
        new Set(dataset[kind].map((entry: { id: string }) => entry.id)).size,
      ).toBe(files.length)
    }
    expect(
      Object.values(dataset.manifest.counts.nutrition).reduce(
        (a, b) => Number(a) + Number(b),
        0,
      ),
    ).toBe(dataset.dishes.length)
  })
  it('uses the actual LICENSE and root semver, and hashes payloads without generation time', () => {
    expect(dataset.manifest.license).toBe(
      fs.readFileSync(path.join(repoRoot, 'LICENSE'), 'utf8'),
    )
    expect(dataset.manifest.version).toBe(
      JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
        .version,
    )
    expect(dataset.manifest.contentHash).toBe(
      createHash('sha256')
        .update(
          JSON.stringify({
            ingredients: dataset.ingredients,
            dishes: dataset.dishes,
            ingredientsMin: dataset.ingredientsMin,
            license: dataset.manifest.license,
          }),
        )
        .digest('hex'),
    )
    expect(
      buildDataset({ generatedAt: '2026-10-03T00:00:00.000Z' }).manifest
        .contentHash,
    ).toBe(dataset.manifest.contentHash)
  })
  it('exports compact bundles with exactly the specified fields', () => {
    expect(Object.keys(dataset.ingredientsMin[0]).sort()).toEqual(
      ['id', 'names', 'group', 'nutrition_per_100g', 'allergens'].sort(),
    )
    const outDir = fs.mkdtempSync(path.join(tmpdir(), 'gos-v1-'))
    try {
      exportDataset({ outDir, generatedAt: '2026-10-02T00:00:00.000Z' })
      expect(fs.readdirSync(outDir).sort()).toEqual([
        'dishes.json',
        'ingredients.json',
        'ingredients.min.json',
        'manifest.json',
      ])
      expect(
        JSON.parse(
          fs.readFileSync(path.join(outDir, 'ingredients.min.json'), 'utf8'),
        ),
      ).toEqual(dataset.ingredientsMin)
    } finally {
      fs.rmSync(outDir, { recursive: true })
    }
  })
  it('rejects invalid nutrients and duplicate stable IDs', () => {
    expect(() =>
      validateDataset({
        ...dataset,
        ingredients: [
          { ...ingredient, nutrition_per_100g: { calories: 'invented' } },
        ],
      }),
    ).toThrow()
    expect(() =>
      validateDataset({ ...dataset, ingredients: [ingredient, ingredient] }),
    ).toThrow('Duplicate ID')
  })
  it('makes IDs path based and preserves evidence, allergens, tags and aliases', () => {
    const result = ingredientRecord(
      {
        ...ingredient,
        health_registry: [
          {
            condition: 'Example',
            evidence_level: 'Low',
            studies: [{ doi: 'source-value', doi_status: 'unverified' }],
          },
        ],
        allergy_profile: { allergens: ['milk'] },
        allergens: undefined,
      },
      'dairy/maiz.md',
    )
    expect(result.id).toBe('gos:ingredient/maiz')
    expect(result.health_registry[0].studies[0].doi_status).toBe('unverified')
    expect(result.allergens).toEqual(['milk'])
    expect(dishRecord({}, 'colombian/nacionales/ajiaco.md', '', []).id).toBe(
      'gos:dish/colombian/nacionales/ajiaco',
    )
  })
  it('keeps placeholder nutrition unknown, including in the offline bundle', () => {
    const pending = dataset.ingredients.filter(
      (entry: { scientific_name: string }) => entry.scientific_name === 'TODO',
    )
    expect(pending.length).toBeGreaterThan(0)
    for (const entry of pending) expect(entry.nutrition_per_100g).toBeNull()
  })
})

describe('dish nutrition provenance', () => {
  it('does not discard plain lines, tables or nested ingredient sections', () => {
    for (const extra of [
      'Salt: 50 g',
      '1. Salt: 50 g',
      '| Salt | 50 g |',
      '### Sauce\n- 50 g de salt',
    ]) {
      const result = dishRecord(
        { servings: 1 },
        'test/example.md',
        `## Ingredients\n- 100 g corn\n${extra}\n## Instructions\nCook`,
        [ingredient],
      )
      expect(result.nutrition_source).toBe('unknown')
    }
  })
  it('preserves unresolved quantity declarations while keeping the export valid', () => {
    const quantities = [
      { name: 'corn', grams: 100 },
      { name: 'missing', grams: 50 },
    ]
    const result = dishRecord(
      { servings: 1, ingredient_quantities: quantities },
      'test/example.md',
      '',
      [ingredient],
    )
    expect(result.nutrition_source).toBe('unknown')
    expect(result.ingredient_quantities).toBeUndefined()
    expect(result.declared_ingredient_quantities).toEqual(quantities)
    expect(() =>
      validateDataset({ ...dataset, dishes: [result] }),
    ).not.toThrow()
  })
  it('computes explicit gram quantities per serving with known micronutrients', () => {
    const result = dishRecord(
      {
        servings: 2,
        ingredient_quantities: [{ ingredientId: ingredient.id, grams: 200 }],
        nutrition_per_serving: { calories: 999 },
      },
      'test/example.md',
      '',
      [ingredient],
    )
    expect(result.nutrition_source).toBe('computed')
    expect(result.nutrition_per_serving).toEqual({
      calories: 100,
      protein_g: 10,
    })
    expect(result.micronutrients_per_serving).toEqual({ potassium_mg: 20 })
  })
  it('resolves aliases and parses complete Markdown ingredient sections only', () => {
    const result = dishRecord(
      { servings: 2 },
      'test/example.md',
      '## Ingredientes\n- 0,2 kg de corn\n\n## Pasos\n- 1 g de sal\n',
      [ingredient],
    )
    expect(result.nutrition_source).toBe('computed')
    expect(result.nutrition_per_serving.calories).toBe(100)
    expect(parseQuantity('Maíz: 50 gramos')).toEqual({
      ingredientId: 'Maíz',
      grams: 50,
    })
    expect(parseQuantity('2 cucharadas de Maíz')).toBeNull()
  })
  it('preserves declared values when any quantity, ingredient or serving count is unavailable', () => {
    for (const partial of [
      { servings: 2, ingredients: ['100 g de missing'] },
      { servings: 2, ingredients: ['100 g de corn', 'sal al gusto'] },
      { ingredients: ['100 g de corn'] },
      { servings: 0, ingredients: ['100 g de corn'] },
    ]) {
      const result = dishRecord(
        { ...partial, nutrition_per_serving: { calories: 75 } },
        'test/example.md',
        '',
        [ingredient],
      )
      expect(result.nutrition_source).toBe('declared')
      expect(result.nutrition_per_serving).toEqual({ calories: 75 })
    }
  })
  it('preserves legacy declared nutrition without assuming its serving basis', () => {
    const nutrition = { calories: 550, macros: { protein_g: 28 } }
    const result = dishRecord({ nutrition }, 'test/example.md', '', [])
    expect(result.nutrition_source).toBe('declared')
    expect(result.nutrition).toEqual(nutrition)
    expect(result.nutrition_per_serving).toBeUndefined()
    expect(dishRecord({}, 'test/example.md', '', []).nutrition_source).toBe(
      'unknown',
    )
  })
  it('does not use placeholder zeroes or ambiguous aliases in calculations', () => {
    const data = { servings: 1, ingredients: ['100 g de corn'] }
    expect(
      dishRecord(data, 'test/example.md', '', [
        { ...ingredient, nutrition_per_100g: null },
      ]).nutrition_source,
    ).toBe('unknown')
    expect(
      dishRecord(data, 'test/example.md', '', [
        ingredient,
        { ...ingredient, id: 'gos:ingredient/other', slug: 'other' },
      ]).nutrition_source,
    ).toBe('unknown')
  })
  it('omits nutrient fields missing from any constituent rather than substituting zero', () => {
    const other = {
      ...ingredient,
      id: 'gos:ingredient/other',
      slug: 'other',
      names: { es: 'Other' },
      aliases: {},
      nutrition_per_100g: { calories: 200 },
      micronutrients: null,
    }
    const result = dishRecord(
      {
        servings: 1,
        ingredient_quantities: [
          { ingredientId: ingredient.id, grams: 100 },
          { ingredientId: other.id, grams: 100 },
        ],
      },
      'test/example.md',
      '',
      [ingredient, other],
    )
    expect(result.nutrition_per_serving).toEqual({ calories: 300 })
    expect(result.micronutrients_per_serving).toEqual({})
  })
})
