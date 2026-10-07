// Guards de src/lib/offline-seed.ts.
//
// MEDIDO 2026-10-01: el módulo pedía /api/recipes.json, /api/ingredients.json,
// /api/vitamins.json, /api/conditions.json y /api/diets.json. NINGUNA existe:
// las cinco devuelven 404, con y sin red. El seed reportaba
// {seeded: 0, skipped: [...]} y nada más lo delataba, así que la PWA quedaba
// sin datos locales pese a "funcionar offline".
//
// Estos tests atacan exactamente ese modo de fallo: que la lista de fuentes
// vuelva a apuntar a endpoints inexistentes.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

// jsdom no expone IndexedDB, así que el adaptador real cortocircuitaría el
// seed en la primera línea y estos tests no medirían nada. Se dobla la capa
// de persistencia y se mide sólo la lógica de fuentes.
const created: Array<{ entity: string; record: { id?: string } }> = []
vi.mock('./indexeddb', () => ({
  IndexedDBStorageAdapter: class {
    async create(entity: string, record: { id?: string }) {
      created.push({ entity, record })
      return record
    }
    async list() {
      return []
    }
  },
}))

const { seedFromStaticBuild, isSeeded } = await import('./offline-seed')

const SEED_SOURCE = readFileSync(
  join(import.meta.dirname, 'offline-seed.ts'),
  'utf8',
)

/** Las URLs que el módulo pide, leídas de la fuente. */
function seededUrls(): string[] {
  const block = SEED_SOURCE.match(/const SEED_SOURCES[\s\S]*?\n\] as const/)
  if (!block) throw new Error('SEED_SOURCES no encontrado')
  return [...block[0].matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1])
}

describe('offline-seed: las fuentes existen de verdad', () => {
  it('no pide /api/recipes.json (404 medido)', () => {
    expect(seededUrls()).not.toContain('/api/recipes.json')
  })

  it('no pide ninguno de los endpoints inexistentes de la v1', () => {
    const ghosts = [
      '/api/recipes.json',
      '/api/ingredients.json',
      '/api/vitamins.json',
      '/api/conditions.json',
      '/api/diets.json',
    ]
    for (const ghost of ghosts) {
      expect(seededUrls(), `${ghost} no existe`).not.toContain(ghost)
    }
  })

  it('usa endpoints que sí genera scripts/generate-api.js', () => {
    for (const url of seededUrls()) {
      expect(url, `${url} debe estar bajo /api/`).toMatch(/^\/api\//)
      expect(url).toMatch(/\.json$/)
    }
    expect(seededUrls()).toContain('/api/all.json')
  })

  it('cada fuente declara la clave de colección y el store', () => {
    for (const key of ['collectionKey', 'store']) {
      const count = (SEED_SOURCE.match(new RegExp(`${key}:`, 'g')) ?? []).length
      const sources = seededUrls().length
      expect(count, `cada fuente necesita ${key}`).toBeGreaterThanOrEqual(sources)
    }
  })
})

describe('offline-seed: siembra de verdad', () => {
  // jsdom NO expone indexedDB, así que sin este stub seedFromStaticBuild()
  // cortocircuitaba en la rama SSR y sembraba 0 siempre: los tests pasarían
  // sin medir nada. El adaptador ya está doblado, sólo hace falta que el
  // global exista para entrar en el bucle de fuentes.
  let hadIndexedDb: boolean
  let originalIndexedDb: unknown

  beforeEach(() => {
    vi.restoreAllMocks()
    created.length = 0
    hadIndexedDb = 'indexedDB' in globalThis
    originalIndexedDb = globalThis.indexedDB
    Object.defineProperty(globalThis, 'indexedDB', {
      value: {},
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    if (!hadIndexedDb) {
      Reflect.deleteProperty(globalThis, 'indexedDB')
    } else {
      globalThis.indexedDB = originalIndexedDb
    }
  })

  it('sembra los registros de /api/all.json', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/api/all.json')) {
        return new Response(
          JSON.stringify({
            recipes: [
              { id: 'r1', title: 'Arroz' },
              { id: 'r2', title: 'Pollo' },
            ],
          }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ substances: [] }), { status: 200 })
    })

    const result = await seedFromStaticBuild()
    expect(result.seeded).toBe(2)
    // /api/substances.json devolvió un array vacío en este mock: se reporta
    // como skipped, que es el comportamiento correcto y no un fallo.
    expect(result.skipped).toEqual(["/api/substances.json: 'substances' vacio o ausente"])
    expect(created.map((c) => c.entity)).toEqual(['recipes', 'recipes'])
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('reporta en skipped cuando el endpoint devuelve 404', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not found', { status: 404 }),
    )
    const result = await seedFromStaticBuild()
    expect(result.seeded).toBe(0)
    expect(result.skipped.length).toBeGreaterThan(0)
    expect(result.skipped.join(' ')).toMatch(/404/)
  })

  it('no siembra registros sin id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ recipes: [{ title: 'sin id' }, { id: 'ok' }] }),
        { status: 200 },
      ),
    )
    const result = await seedFromStaticBuild()
    // 1 válido + 1 de substances vacío -> 1
    expect(result.seeded).toBe(1)
  })

  it('devuelve skipped SSR sin tocar fetch cuando no hay indexedDB', async () => {
    // El adaptador está doblado, así que para ejercitar la rama SSR hay que
    // retirar el global: es la condición real que el módulo comprueba.
    const original = globalThis.indexedDB
    // @ts-expect-error -- simulando un runtime sin IndexedDB
    delete globalThis.indexedDB
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    try {
      const result = await seedFromStaticBuild()
      expect(result.seeded).toBe(0)
      expect(result.skipped).toContain('SSR environment')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.indexedDB = original
    }
  })
})

describe('offline-seed: isSeeded consulta el store correcto', () => {
  it('consulta el store recipe, no ingredient', () => {
    // isSeeded() pedía 'ingredient' mientras sembraba en 'recipes'/'substances':
    // nunca podía confirmar la siembra.
    expect(SEED_SOURCE).toMatch(/adapter\.list\('recipe'/)
    expect(SEED_SOURCE).not.toMatch(/adapter\.list\('ingredient'/)
  })

  it('isSeeded no lanza con indexedDB ausente', async () => {
    await expect(isSeeded()).resolves.toBeTypeOf('boolean')
  })
})
