import { memoryCache } from './cache.js'
import type {
  CacheAdapter,
  DatasetManifest,
  Dish,
  Ingredient,
  Nutrients,
  NutritionResult,
} from './types.js'

export { indexedDbCache, memoryCache } from './cache.js'
export type {
  CacheAdapter,
  DatasetManifest,
  Dish,
  EvidenceStudy,
  HealthEvidence,
  Ingredient,
  Nutrients,
  NutritionResult,
} from './types.js'

export interface GosClientOptions {
  baseUrl?: string
  cache?: CacheAdapter
  fetch?: typeof globalThis.fetch
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function createGosClient(options: GosClientOptions = {}) {
  const baseUrl = (
    options.baseUrl ?? 'https://gos.swal.network/api/v1'
  ).replace(/\/+$/, '')
  const cache = options.cache ?? memoryCache()
  const fetcher = options.fetch ?? globalThis.fetch
  const key = (suffix: string) => `${baseUrl}:${suffix}`
  const pending = new Map<string, Promise<unknown>>()

  function deduplicate<T>(name: string, task: () => Promise<T>): Promise<T> {
    const existing = pending.get(name)
    if (existing) return existing as Promise<T>
    const promise = task().finally(() => pending.delete(name))
    pending.set(name, promise)
    return promise
  }
  async function request<T>(file: string): Promise<T> {
    const response = await fetcher(`${baseUrl}/${file}`, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`GOS ${file}: HTTP ${response.status}`)
    return response.json() as Promise<T>
  }
  function refreshManifest() {
    return deduplicate('manifest', async () => {
      const manifest = await request<DatasetManifest>('manifest.json')
      if (manifest.schemaVersion !== '1')
        throw new Error('Unsupported GOS schema version')
      await cache.set(key('manifest'), manifest)
      return manifest
    })
  }
  async function getManifest(): Promise<DatasetManifest> {
    const cached = await cache.get<DatasetManifest>(key('manifest'))
    if (cached) {
      void refreshManifest().catch(() => {})
      return cached
    }
    return refreshManifest()
  }
  function refreshDataset<T>(kind: 'ingredients' | 'dishes'): Promise<T[]> {
    return deduplicate(kind, async () => {
      const manifest = await refreshManifest()
      const versionKey = key(
        `${manifest.version}:${manifest.contentHash}:${kind}`,
      )
      let data = await cache.get<T[]>(versionKey)
      if (data === undefined) {
        data = await request<T[]>(manifest.files[kind])
        if (!Array.isArray(data))
          throw new Error(`GOS ${kind}: expected an array`)
        await cache.set(versionKey, data)
      }
      // Keep the last complete dataset reachable even if a later fetch fails offline.
      await cache.set(key(`${kind}:latest`), versionKey)
      return data
    })
  }
  async function list<T>(kind: 'ingredients' | 'dishes'): Promise<T[]> {
    const latest = await cache.get<string>(key(`${kind}:latest`))
    const cached = latest ? await cache.get<T[]>(latest) : undefined
    if (cached !== undefined) {
      void refreshDataset<T>(kind).catch(() => {})
      return cached
    }
    return refreshDataset<T>(kind)
  }
  const listIngredients = () => list<Ingredient>('ingredients')
  const listDishes = () => list<Dish>('dishes')
  async function getIngredient(
    idOrSlug: string,
  ): Promise<Ingredient | undefined> {
    return (await listIngredients()).find(
      (ingredient) =>
        ingredient.id === idOrSlug || ingredient.slug === idOrSlug,
    )
  }
  async function searchIngredients(
    q: string,
    { lang }: { lang?: string } = {},
  ): Promise<Ingredient[]> {
    const query = normalize(q.trim())
    return (await listIngredients()).filter((ingredient) => {
      const names = lang
        ? [ingredient.names[lang] ?? ingredient.names.es]
        : Object.values(ingredient.names)
      const aliases = lang
        ? (ingredient.aliases[lang] ?? [])
        : Object.values(ingredient.aliases).flat()
      return [...names, ...aliases, ingredient.slug].some((name) =>
        normalize(name).includes(query),
      )
    })
  }
  async function getDish(id: string): Promise<Dish | undefined> {
    return (await listDishes()).find((dish) => dish.id === id)
  }
  async function nutritionFor(
    items: { ingredientId: string; grams: number }[],
  ): Promise<NutritionResult> {
    for (const item of items) {
      if (!Number.isFinite(item.grams) || item.grams < 0)
        throw new RangeError('grams must be finite and non-negative')
    }
    const ingredients = new Map(
      (await listIngredients()).map((ingredient) => [
        ingredient.id,
        ingredient,
      ]),
    )
    const result: NutritionResult = {
      nutrition: {},
      micronutrients: {},
      missing: [],
      complete: true,
    }
    const selected = items
      .filter((item) => item.grams > 0)
      .map((item) => ingredients.get(item.ingredientId))
    const macroKeys = new Set(
      selected.flatMap((ingredient) =>
        Object.keys(ingredient?.nutrition_per_100g ?? {}),
      ),
    )
    const microKeys = new Set(
      selected.flatMap((ingredient) =>
        Object.keys(ingredient?.micronutrients ?? {}),
      ),
    )
    const incomplete = (block: Nutrients | null, keys: Set<string>) =>
      !block ||
      Object.keys(block).length === 0 ||
      [...keys].some((nutrient) => !Number.isFinite(block[nutrient]))
    const add = (
      target: Nutrients,
      source: Nutrients | null,
      grams: number,
    ) => {
      for (const [nutrient, amount] of Object.entries(source ?? {})) {
        if (Number.isFinite(amount))
          target[nutrient] = (target[nutrient] ?? 0) + (amount * grams) / 100
      }
    }
    for (const item of items) {
      if (item.grams === 0) continue
      const ingredient = ingredients.get(item.ingredientId)
      if (
        !ingredient ||
        incomplete(ingredient.nutrition_per_100g, macroKeys) ||
        incomplete(ingredient.micronutrients, microKeys)
      )
        result.missing.push(item.ingredientId)
      if (ingredient) {
        add(result.nutrition, ingredient.nutrition_per_100g, item.grams)
        add(result.micronutrients, ingredient.micronutrients, item.grams)
      }
    }
    result.missing = [...new Set(result.missing)]
    result.complete = result.missing.length === 0
    return result
  }
  return {
    getManifest,
    listIngredients,
    getIngredient,
    searchIngredients,
    listDishes,
    getDish,
    nutritionFor,
  }
}

export type GosClient = ReturnType<typeof createGosClient>
