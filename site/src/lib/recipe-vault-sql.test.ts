import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IndexedDBStorageAdapter } from './indexeddb'
import { VAULT_INSTANCE, vaultCreate, vaultList, parseVaultExport } from './recipe-vault'
import { buildVaultSqlDump, buildAllDataJson } from './recipe-vault-sql'
import initSqlJs from 'sql.js'

// --- Mocks para simular IndexedDB (copiados de recipe-vault-store.test.ts) ---

class FakeReq<T> {
  result: T | undefined
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null
}

const REAL_STORES = [
  'recipes',
  'ingredients',
  'vitamins',
  'conditions',
  'diets',
  'substances',
  'tips',
  'techniques',
]

type Rec = any

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
    return this.store
  }
}

class FakeDb {
  stores = new Map<string, FakeStore>()
  objectStoreNames = {
    contains: (n: string) => (REAL_STORES as readonly string[]).includes(n),
  } as unknown as { contains: (n: string) => boolean }
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

// --- Tests ---

describe('recipe-vault-sql export', () => {
  let adapter: IndexedDBStorageAdapter

  beforeEach(() => {
    installFakeIDB()
    trapNetwork()
    adapter = new IndexedDBStorageAdapter()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('JSON round-trip: serializes and parses identically to original export', async () => {
    await vaultCreate(adapter, VAULT_INSTANCE, {
      title: 'Arepas de choclo',
      main_ingredients: ['Maíz dulce', 'Queso fresco'],
      instructions: ['Licuar', 'Cocinar'],
    })
    await vaultCreate(adapter, VAULT_INSTANCE, {
      title: 'Bandeja Paisa',
      main_ingredients: ['Frijoles', 'Arroz'],
      instructions: ['Servir abundante'],
    })

    const rows = await vaultList(adapter, VAULT_INSTANCE)
    const exportedAt = '2026-01-01T00:00:00.000Z'
    const json = buildAllDataJson(rows, exportedAt)

    const parsed = parseVaultExport(json)
    expect(parsed.ok).toBe(true)
    expect(parsed.drafts).toHaveLength(2)
    // Orden de list (más reciente primero): Bandeja Paisa, Arepas
    expect(parsed.drafts[0].title).toBe('Bandeja Paisa')
    expect(parsed.drafts[1].title).toBe('Arepas de choclo')

    expect(netCalls).toEqual([])
  })

  it('SQL restores into an empty store matching exactly N rows', async () => {
    await vaultCreate(adapter, VAULT_INSTANCE, {
      title: "Receta con comillas 'simples'",
      main_ingredients: ['Agua'],
      instructions: ['Paso 1\nPaso 2 con salto'],
    })
    const rows = await vaultList(adapter, VAULT_INSTANCE)

    const sqlStr = buildVaultSqlDump(rows)

    const SQL = await initSqlJs()
    const db = new SQL.Database()

    db.run(sqlStr)

    const res = db.exec("SELECT count(*) as c FROM recipe")
    expect(res[0].values[0][0]).toBe(1)

    const row = db.exec("SELECT data FROM recipe")[0].values[0][0] as string
    const data = JSON.parse(row)
    expect(data.title).toBe("Receta con comillas 'simples'")
    expect(data.instructions[0]).toBe("Paso 1\nPaso 2 con salto")

    expect(netCalls).toEqual([])
  })

  it('no toca la red', () => {
    trapNetwork()
    buildAllDataJson([])
    buildVaultSqlDump([])
    expect(netCalls).toEqual([])
  })
})
