import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import type { DatasetManifest, Ingredient } from '../src/index.js'
import { createGosClient, indexedDbCache, memoryCache } from '../src/index.js'

const ingredient: Ingredient = {
  id: 'gos:ingredient/platano',
  slug: 'platano',
  names: { es: 'Plátano', en: 'Plantain' },
  group: 'fruits',
  nutrition_per_100g: { energy_kcal: 120, protein_g: 2 },
  micronutrients: { potassium_mg: 300 },
  allergens: [],
  aliases: { es: ['Banano'], en: ['Cooking banana'] },
  tags: [],
  portions: null,
  health_registry: [],
}
const dish = {
  id: 'gos:dish/colombia/patacon',
  slug: 'patacon',
  country: 'colombia',
  nutrition_source: 'unknown',
  aliases: {},
  tags: [],
  allergens: [],
  health_registry: [],
}
function fixture(cache = memoryCache()) {
  let offline = false
  let revision = 'a'.repeat(64)
  let version = '0.0.1'
  let ingredients = [ingredient]
  const fetcher = vi.fn(async (url: string | URL | Request) => {
    if (offline) throw new Error('Offline')
    const file = String(url).split('/').pop()
    const manifest: DatasetManifest = {
      schemaVersion: '1',
      version,
      contentHash: revision,
      generatedAt: '2026-10-02T00:00:00.000Z',
      counts: {
        ingredients: ingredients.length,
        dishes: 1,
        nutrition: { computed: 0, declared: 0, unknown: 1 },
      },
      license: 'Unlicense',
      files: {
        ingredients: 'ingredients.json',
        dishes: 'dishes.json',
        ingredientsMin: 'ingredients.min.json',
      },
    }
    return new Response(
      JSON.stringify(
        file === 'manifest.json'
          ? manifest
          : file === 'ingredients.json'
            ? ingredients
            : [dish],
      ),
    )
  })
  const options = { cache, fetch: fetcher as typeof fetch }
  return {
    client: createGosClient(options),
    options,
    fetcher,
    offline: () => {
      offline = true
    },
    update: (entries: Ingredient[]) => {
      revision = 'b'.repeat(64)
      ingredients = entries
    },
    version: (value: string) => {
      version = value
    },
  }
}

describe('GOS client', () => {
  it('loads the manifest, ingredients and dishes with stable lookup', async () => {
    const { client, fetcher } = fixture()
    expect((await client.getManifest()).version).toBe('0.0.1')
    expect(await client.getIngredient(ingredient.id)).toEqual(ingredient)
    expect(await client.getIngredient('platano')).toEqual(ingredient)
    expect(await client.getIngredient('absent')).toBeUndefined()
    expect(await client.listDishes()).toEqual([dish])
    expect(await client.getDish(dish.id)).toEqual(dish)
    expect(await client.getDish('patacon')).toBeUndefined()
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://gos.swal.network/api/v1/manifest.json',
    )
  })

  it('searches accents and multilingual aliases, honoring the language', async () => {
    const { client } = fixture()
    expect(await client.searchIngredients('PLATANO', { lang: 'es' })).toEqual([
      ingredient,
    ])
    expect(await client.searchIngredients('banana', { lang: 'en' })).toEqual([
      ingredient,
    ])
    expect(await client.searchIngredients('banana', { lang: 'es' })).toEqual([])
    expect(await client.searchIngredients('banano')).toEqual([ingredient])
  })

  it('sums the recorded macros and micros by grams', async () => {
    const { client } = fixture()
    expect(
      await client.nutritionFor([
        { ingredientId: ingredient.id, grams: 50 },
        { ingredientId: ingredient.id, grams: 150 },
      ]),
    ).toEqual({
      nutrition: { energy_kcal: 240, protein_g: 4 },
      micronutrients: { potassium_mg: 600 },
      missing: [],
      complete: true,
    })
  })

  it('reports unknown nutrition without fabricating fields', async () => {
    const f = fixture()
    const unknown = {
      ...ingredient,
      id: 'gos:ingredient/unknown',
      nutrition_per_100g: null,
      micronutrients: null,
    }
    f.update([ingredient, unknown])
    expect(
      await f.client.nutritionFor([
        { ingredientId: unknown.id, grams: 100 },
        { ingredientId: 'missing', grams: 50 },
      ]),
    ).toEqual({
      nutrition: {},
      micronutrients: {},
      missing: [unknown.id, 'missing'],
      complete: false,
    })
    expect(
      await f.client.nutritionFor([{ ingredientId: 'missing', grams: 0 }]),
    ).toEqual({
      nutrition: {},
      micronutrients: {},
      missing: [],
      complete: true,
    })
  })

  it.each([-1, NaN, Infinity])(
    'rejects invalid quantities %s',
    async (grams) => {
      await expect(
        fixture().client.nutritionFor([{ ingredientId: ingredient.id, grams }]),
      ).rejects.toThrow(RangeError)
    },
  )

  it('flags empty nutrient blocks and mismatched keys as partial while retaining known totals', async () => {
    const f = fixture()
    const partial = {
      ...ingredient,
      id: 'gos:ingredient/partial',
      nutrition_per_100g: { energy_kcal: 50 },
      micronutrients: {},
    }
    f.update([ingredient, partial])
    expect(
      await f.client.nutritionFor([
        { ingredientId: ingredient.id, grams: 100 },
        { ingredientId: partial.id, grams: 100 },
      ]),
    ).toEqual({
      nutrition: { energy_kcal: 170, protein_g: 2 },
      micronutrients: { potassium_mg: 300 },
      missing: [partial.id],
      complete: false,
    })
  })

  it('serves stale data immediately and revalidates a changed content hash at the same semver', async () => {
    const f = fixture()
    await f.client.listIngredients()
    const revised = { ...ingredient, names: { es: 'Plátano actualizado' } }
    f.update([revised])
    expect(await f.client.listIngredients()).toEqual([ingredient])
    await vi.waitFor(async () =>
      expect(await f.client.listIngredients()).toEqual([revised]),
    )
    expect((await f.client.getManifest()).contentHash).toBe('b'.repeat(64))
  })

  it('revalidates when semver changes even if the hash stays the same', async () => {
    const f = fixture()
    await f.client.listIngredients()
    f.version('0.1.0')
    await f.client.listIngredients()
    await vi.waitFor(async () =>
      expect((await f.client.getManifest()).version).toBe('0.1.0'),
    )
    await vi.waitFor(() =>
      expect(
        f.fetcher.mock.calls.filter(([url]) =>
          String(url).endsWith('/ingredients.json'),
        ),
      ).toHaveLength(2),
    )
  })

  it.each(['memory', 'indexeddb'])(
    'survives a new client instance offline with %s cache',
    async (kind) => {
      const dbName = `gos-test-${crypto.randomUUID()}`
      const cache = kind === 'memory' ? memoryCache() : indexedDbCache(dbName)
      const f = fixture(cache)
      await f.client.listIngredients()
      await f.client.listDishes()
      f.offline()
      const newClient = createGosClient({
        ...f.options,
        cache: kind === 'memory' ? cache : indexedDbCache(dbName),
      })
      expect((await newClient.getManifest()).contentHash).toBe('a'.repeat(64))
      expect(await newClient.listIngredients()).toEqual([ingredient])
      expect(await newClient.getDish(dish.id)).toEqual(dish)
    },
  )

  it('does not erase the last complete snapshot when a refresh fails', async () => {
    const f = fixture()
    await f.client.listIngredients()
    f.offline()
    expect(await f.client.listIngredients()).toEqual([ingredient])
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(await f.client.listIngredients()).toEqual([ingredient])
  })

  it('deduplicates concurrent cold loads', async () => {
    const f = fixture()
    await Promise.all([
      f.client.listIngredients(),
      f.client.listIngredients(),
      f.client.listIngredients(),
    ])
    expect(
      f.fetcher.mock.calls.map(([url]) => String(url).split('/').pop()),
    ).toEqual(['manifest.json', 'ingredients.json'])
  })

  it('isolates shared cache entries by base URL', async () => {
    const f = fixture()
    await f.client.listIngredients()
    f.offline()
    const other = createGosClient({
      ...f.options,
      baseUrl: 'https://another.example/api/v1/',
    })
    await expect(other.listIngredients()).rejects.toThrow('Offline')
  })

  it('propagates HTTP errors on a cold load', async () => {
    const client = createGosClient({
      fetch: vi.fn(
        async () => new Response('', { status: 503 }),
      ) as typeof fetch,
    })
    await expect(client.getManifest()).rejects.toThrow('HTTP 503')
  })

  it('returns copies so consumers cannot mutate the memory cache', async () => {
    const f = fixture()
    const ingredients = await f.client.listIngredients()
    ingredients[0].names.es = 'Mutated'
    expect((await f.client.listIngredients())[0].names.es).toBe('Plátano')
  })
})
