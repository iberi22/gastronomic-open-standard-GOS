// site/src/lib/offline-seed.ts — populate IndexedDB from static JSON on PWA load
// Runs once per page load in browser context. Falls back silently if offline.
//
// MEDIDO 2026-10-01: las 5 URLs que este módulo pedía (/api/recipes.json,
// /api/ingredients.json, /api/vitamins.json, /api/conditions.json,
// /api/diets.json) NO EXISTEN — devuelven 404 con y sin red, así que el seed
// sembraba 0 registros y lo reportaba como "skipped" sin quejarse. Los
// catálogos reales que genera scripts/generate-api.js son /api/all.json
// (objeto {recipes:[...]}) y /api/substances.json ({substances:[...]}).
// La lista de abajo se valida contra lo que existe de verdad en dist/api/.

import { IndexedDBStorageAdapter } from './indexeddb'

/**
 * Cada entrada mapea un endpoint real a su store de IndexedDB.
 * `collectionKey` es la propiedad del JSON que contiene el array de registros;
 * `singular` es el nombre del store, que se usa en singular en la API.
 */
const SEED_SOURCES = [
  {
    url: '/api/all.json',
    collectionKey: 'recipes',
    store: 'recipes',
  },
  {
    url: '/api/substances.json',
    collectionKey: 'substances',
    store: 'substances',
  },
] as const

export async function seedFromStaticBuild(
  baseUrl = '',
): Promise<{ seeded: number; skipped: string[] }> {
  if (typeof indexedDB === 'undefined') {
    return { seeded: 0, skipped: ['SSR environment'] }
  }

  const adapter = new IndexedDBStorageAdapter()
  let seeded = 0
  const skipped: string[] = []

  for (const source of SEED_SOURCES) {
    try {
      const res = await fetch(`${baseUrl}${source.url}`, {
        cache: 'force-cache',
      })
      if (!res.ok) {
        skipped.push(`${source.url}: HTTP ${res.status}`)
        continue
      }
      const payload = (await res.json()) as Record<
        string,
        Array<{
          id: string
          instance_id?: string
          created_at?: string
        }>
      >
      const records = payload?.[source.collectionKey]
      if (!Array.isArray(records) || records.length === 0) {
        skipped.push(`${source.url}: '${source.collectionKey}' vacio o ausente`)
        continue
      }
      for (const record of records) {
        if (!record?.id) continue
        const withMeta = {
          ...record,
          instance_id: record.instance_id || 'seed-default',
          updated_at: new Date().toISOString(),
          created_at: record.created_at || new Date().toISOString(),
        }
        await adapter.create(source.store, withMeta)
        seeded++
      }
    } catch (err) {
      skipped.push(`${source.url}: ${String(err)}`)
    }
  }

  return { seeded, skipped }
}

export async function isSeeded(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false
  try {
    const adapter = new IndexedDBStorageAdapter()
    const records = await adapter.list('recipe', 'seed-default')
    return records.length > 0
  } catch {
    return false
  }
}
