// site/src/lib/recipe-vault-store.test.ts — prueba del requisito "100% offline".
//
// Ejecuta toda la orquestación del vault (crear/leer/borrar/importar/exportar)
// contra el IndexedDBStorageAdapter REAL (con un fake de IndexedDB en memoria) y
// con la red TRAMPAO: fetch/XHR/WebSocket/EventSource/sendBeacon lanzan si alguien
// los toca. Si cualquier ruta del vault saliera a la red, estos tests fallan.
//
// Usa la capa headless (recipe-vault.ts), no el componente Svelte: vitest no
// tiene plugin de Svelte en este repo, y la lógica debe ser testeable igual.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IndexedDBStorageAdapter } from './indexeddb'
import {
  nextVaultRecipeId,
  VAULT_EXPORT_FORMAT,
  VAULT_INSTANCE,
  vaultCreate,
  vaultDelete,
  vaultExport,
  vaultImport,
  vaultList,
  vaultUpdate,
} from './recipe-vault'

// --- Fake IndexedDB (mismo patrón que indexeddb.test.ts) ---
type Rec = Record<string, unknown> & { id: string }

class FakeReq<T> {
  result: T | undefined
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null
}

class FakeStore {
  map = new Map<string, Rec>()
  put(r: Rec) {
    this.map.set(r.id, r)
    const q = new FakeReq<Rec>()
    q.result = r
    setTimeout(() => q.onsuccess?.(), 0)
    return q
  }
  get(id: string) {
    const q = new FakeReq<Rec | undefined>()
    q.result = this.map.get(id)
    setTimeout(() => q.onsuccess?.(), 0)
    return q
  }
  getAll() {
    const q = new FakeReq<Rec[]>()
    q.result = [...this.map.values()]
    setTimeout(() => q.onsuccess?.(), 0)
    return q
  }
  delete(id: string) {
    this.map.delete(id)
    const q = new FakeReq<void>()
    setTimeout(() => q.onsuccess?.(), 0)
    return q
  }
}

class FakeTx {
  store: FakeStore
  constructor(store: FakeStore) {
    this.store = store
  }
  objectStore() {
    return this.store as unknown as IDBObjectStore
  }
}

// Stores reales de site/src/lib/indexeddb.ts. El fake debe fallar ante un
// store desconocido, igual que IndexedDB (NotFoundError). Un fake que crea
// stores bajo demanda oculta el bug singular/plural: los 105 tests passaban
// con adapter.list('recipe') y el vault fallaba en el navegador real.
const REAL_STORES = [
  'recipes',
  'ingredients',
  'vitamins',
  'conditions',
  'diets',
  'substances',
  'tips',
  'techniques',
] as const

class FakeDb {
  stores = new Map<string, FakeStore>()
  objectStoreNames = {
    contains: (n: string) => (REAL_STORES as readonly string[]).includes(n),
  } as unknown as { contains: (n: string) => boolean }
  // Contrato real de IDBDatabase: el adaptador cierra la conexion que abre (y
  // la cerraria antes si otra pestana pidiera subir la version). Sin close()
  // el doble reventaba con "db.close is not a function".
  onversionchange: (() => void) | null = null
  closeCount = 0
  close() {
    this.closeCount += 1
  }
  transaction(name: string) {
    if (!this.objectStoreNames.contains(name)) {
      const err = new Error(
        `Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`,
      )
      err.name = 'NotFoundError'
      throw err
    }
    let s = this.stores.get(name)
    if (!s) {
      s = new FakeStore()
      this.stores.set(name, s)
    }
    return new FakeTx(s) as unknown as IDBTransaction
  }
}

let netCalls: string[]
let fakeDb: FakeDb

function installFakeIDB(): void {
  const db = new FakeDb()
  fakeDb = db
  vi.stubGlobal('indexedDB', {
    open: () => {
      const q = new FakeReq<FakeDb>()
      q.result = db
      setTimeout(() => q.onsuccess?.(), 0)
      return q
    },
  })
}

/** Red TRAMPAO: cualquier uso lanza y queda registrado. */
function trapNetwork(): void {
  netCalls = []
  const boom =
    (who: string) =>
    (..._args: unknown[]) => {
      netCalls.push(who)
      throw new Error(`RED BLOQUEADA: el vault intentó usar ${who}`)
    }
  vi.stubGlobal('fetch', boom('fetch'))
  vi.stubGlobal('XMLHttpRequest', boom('XMLHttpRequest'))
  vi.stubGlobal('WebSocket', boom('WebSocket'))
  vi.stubGlobal('EventSource', boom('EventSource'))
  vi.stubGlobal('sendBeacon', boom('sendBeacon'))
}

const VALID = {
  title: 'Arepas de choclo',
  main_ingredients: ['Maíz dulce', 'Queso fresco'],
  instructions: ['Licuar', 'Cocinar'],
}

const exportFile = (recipes: unknown[]) =>
  JSON.stringify({
    format: VAULT_EXPORT_FORMAT,
    version: 1,
    exported_at: '2026-01-01T00:00:00.000Z',
    recipes,
  })

describe('RecipeVault store — 100% offline (red trampeada)', () => {
  let adapter: IndexedDBStorageAdapter

  beforeEach(() => {
    installFakeIDB()
    trapNetwork()
    adapter = new IndexedDBStorageAdapter()
  })

  it('no deja conexiones de IndexedDB abiertas', async () => {
    // Cada ruta del adaptador hace `await openDB()`. Si no cierra, cada
    // operacion deja una conexion abierta: otra pestana que pida subir la
    // version se queda bloqueada para siempre (ROBUSTEZ §1.4).
    const id = (await vaultCreate(adapter, VAULT_INSTANCE, VALID)).records?.[0]
      .id as string
    await vaultList(adapter, VAULT_INSTANCE)
    await vaultUpdate(adapter, VAULT_INSTANCE, id, VALID)
    await vaultDelete(adapter, VAULT_INSTANCE, id)
    expect(fakeDb.closeCount).toBe(4)
  })

  // Guard de singular/plural. El fake IndexedDB lanza NotFoundError ante un
  // store inexistente, igual que el navegador: esto ata el bug que hacia que
  // el vault dijera "este navegador no expone IndexedDB" con la DB sana.
  it('el vault solo pide object stores que existen de verdad', async () => {
    await expect(vaultList(adapter, VAULT_INSTANCE)).resolves.toEqual([])
    await expect(
      vaultCreate(adapter, VAULT_INSTANCE, VALID),
    ).resolves.toMatchObject({ ok: true })
    const id = (await vaultList(adapter, VAULT_INSTANCE))[0].id
    await expect(
      vaultUpdate(adapter, VAULT_INSTANCE, id, VALID),
    ).resolves.toMatchObject({ ok: true })
    await expect(
      vaultDelete(adapter, VAULT_INSTANCE, id),
    ).resolves.toMatchObject({ ok: true })
  })

  it('crear, leer y borrar funcionan con la red bloqueada', async () => {
    // crear
    const created = await vaultCreate(adapter, VAULT_INSTANCE, VALID)
    expect(created.ok).toBe(true)
    const id = created.records?.[0].id as string
    expect(netCalls).toEqual([])

    // leer
    const rows = await vaultList(adapter, VAULT_INSTANCE)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Arepas de choclo')
    expect(rows[0].instance_id).toBe(VAULT_INSTANCE)
    expect(netCalls).toEqual([])

    // borrar
    const deleted = await vaultDelete(adapter, VAULT_INSTANCE, id)
    expect(deleted.ok).toBe(true)
    expect(await vaultList(adapter, VAULT_INSTANCE)).toHaveLength(0)
    expect(netCalls).toEqual([])
  })

  it('exportar e importar funcionan con la red bloqueada', async () => {
    await vaultCreate(adapter, VAULT_INSTANCE, VALID)
    const rows = await vaultList(adapter, VAULT_INSTANCE)

    // exportar (puro: string, sin DOM ni red)
    const { json, filename } = vaultExport(rows, '2026-01-01T00:00:00.000Z')
    expect(filename).toMatch(/^gos-vault-.*\.json$/)
    const parsed = JSON.parse(json)
    expect(parsed.format).toBe(VAULT_EXPORT_FORMAT)
    expect(parsed.recipes).toHaveLength(1)
    expect(netCalls).toEqual([])

    // importar en otro "dispositivo" (adapter nuevo = mismo fake, borrado antes)
    const rowsBefore = await vaultList(adapter, VAULT_INSTANCE)
    for (const r of rowsBefore) {
      await vaultDelete(adapter, VAULT_INSTANCE, r.id)
    }
    const imported = await vaultImport(adapter, VAULT_INSTANCE, json, [])
    expect(imported.ok).toBe(true)
    expect(imported.imported).toBe(1)
    expect(netCalls).toEqual([])

    const after = await vaultList(adapter, VAULT_INSTANCE)
    expect(after).toHaveLength(1)
    expect(after[0].title).toBe('Arepas de choclo')
  })

  it('actualizar valida contra el estándar antes de escribir', async () => {
    const created = await vaultCreate(adapter, VAULT_INSTANCE, VALID)
    const id = created.records?.[0].id as string

    const ok = await vaultUpdate(adapter, VAULT_INSTANCE, id, {
      ...VALID,
      title: 'Arepas de choclo mejoradas',
      servings: 6,
    })
    expect(ok.ok).toBe(true)
    expect(ok.records?.[0].servings).toBe('6')

    // payload inválido: no escribe y explica por qué
    const bad = await vaultUpdate(adapter, VAULT_INSTANCE, id, {
      ...VALID,
      title: '',
    })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('título')

    const rows = await vaultList(adapter, VAULT_INSTANCE)
    expect(rows[0].title).toBe('Arepas de choclo mejoradas')
    expect(netCalls).toEqual([])
  })

  it('no guarda una receta que no cumple el estándar', async () => {
    const bad = await vaultCreate(adapter, VAULT_INSTANCE, {
      title: 'Solo relleno',
      main_ingredients: ['Ingrediente principal 1'],
    })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('ingrediente real')
    expect(await vaultList(adapter, VAULT_INSTANCE)).toHaveLength(0)
    expect(netCalls).toEqual([])
  })

  it('importar revalida: descarta inválidas, limpia placeholders y no pisa locales', async () => {
    // una receta local que NO debe ser pisada
    const local = await vaultCreate(adapter, VAULT_INSTANCE, VALID)
    const localId = local.records?.[0].id as string

    const file = exportFile([
      {
        title: 'Receta importada',
        main_ingredients: ['Ingrediente principal 1', 'Maíz'],
        prep_time: '20',
      },
      { title: 'sin nada', main_ingredients: [] },
    ])

    const result = await vaultImport(
      adapter,
      VAULT_INSTANCE,
      file,
      await vaultList(adapter, VAULT_INSTANCE),
    )
    expect(result.ok).toBe(true)
    expect(result.imported).toBe(1)
    expect(result.rejected).toBe(1)

    const rows = await vaultList(adapter, VAULT_INSTANCE)
    expect(rows).toHaveLength(2)

    // la local sigue intacta con su id original
    const kept = rows.find((r) => r.id === localId)
    expect(kept?.title).toBe('Arepas de choclo')

    // la importada entró normalizada
    const imported = rows.find((r) => r.id !== localId)
    expect(imported?.title).toBe('Receta importada')
    expect(imported?.main_ingredients).toEqual(['Maíz'])
    expect(imported?.prep_time).toBe('20 min')
    expect(netCalls).toEqual([])
  })

  it('importar rechaza un archivo que no es del vault GOS', async () => {
    const result = await vaultImport(
      adapter,
      VAULT_INSTANCE,
      JSON.stringify({ format: 'otro-coso', version: 1, recipes: [VALID] }),
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('vault GOS')
    expect(result.imported).toBe(0)
    expect(netCalls).toEqual([])
  })

  it('aisla por instance_id: otro "dispositivo" no ve estas recetas', async () => {
    await vaultCreate(adapter, VAULT_INSTANCE, VALID)
    expect(await vaultList(adapter, VAULT_INSTANCE)).toHaveLength(1)
    // Otra instancia = otro dispositivo/usuario: vacío.
    expect(await vaultList(adapter, 'otro-dispositivo')).toHaveLength(0)
    expect(netCalls).toEqual([])
  })

  it('borrar una receta de otro dispositivo no la toca', async () => {
    const created = await vaultCreate(adapter, VAULT_INSTANCE, VALID)
    const id = created.records?.[0].id as string
    const denied = await vaultDelete(adapter, 'otro-dispositivo', id)
    expect(denied.ok).toBe(false)
    expect(await vaultList(adapter, VAULT_INSTANCE)).toHaveLength(1)
    expect(netCalls).toEqual([])
  })

  it('nunca reutiliza un id, ni dentro del mismo lote importado', () => {
    // Reloj congelado: nextVaultRecipeId usa Date.now() internamente, y sin
    // esto el "base" del test y el de la función caen en milisegundos distintos.
    vi.useFakeTimers()
    try {
      const base = `vault-${Date.now().toString(36)}`
      expect(nextVaultRecipeId([])).toBe(base)
      expect(nextVaultRecipeId([base])).toBe(`${base}-2`)
      expect(nextVaultRecipeId([base, `${base}-2`])).toBe(`${base}-3`)
    } finally {
      vi.useRealTimers()
    }
  })

  it('el módulo del vault no importa nada de red', async () => {
    // Guardia estructural: si alguien mete un fetch al vault, esto lo detecta
    // por análisis del código fuente del módulo.
    // Path absoluto: bajo vitest/jsdom `import.meta.url` no es un file:// URL.
    // Se escanea el CÓDIGO, no los comentarios: la cabecera de recipe-vault.ts
    // menciona fetch/XHR/WebSocket justamente para documentar que no se usan.
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const raw = readFileSync(
      resolve(process.cwd(), 'src/lib/recipe-vault.ts'),
      'utf8',
    )
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bfetch\s*\(/)
    expect(code).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|sendBeacon/)
    // Y solo habla con el adapter inyectado, no con un backend de red.
    expect(code).not.toMatch(/from\s+['"].*surreal|edge-hive|cloudflare/)
  })
})

// Cada test restaura los globals trampeados.
afterEach(() => {
  vi.unstubAllGlobals()
})
