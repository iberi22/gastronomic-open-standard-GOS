import { beforeEach, describe, expect, it } from 'vitest'
import { IndexedDBStorageAdapter, isIndexedDBAvailable } from './indexeddb'

// Mock minimal IndexedDB for jsdom environment
type FakeRecord = Record<string, unknown> & { id: string }
class FakeIDBRequest<T> {
  result: T | undefined
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null
}

class FakeIDBObjectStore {
  store = new Map<string, FakeRecord>()
  put(record: FakeRecord): FakeIDBRequest<FakeRecord> {
    this.store.set(record.id, record)
    const req = new FakeIDBRequest<FakeRecord>()
    req.result = record
    setTimeout(() => req.onsuccess?.(), 0)
    return req
  }
  get(id: string): FakeIDBRequest<FakeRecord | undefined> {
    const req = new FakeIDBRequest<FakeRecord>()
    req.result = this.store.get(id)
    setTimeout(() => req.onsuccess?.(), 0)
    return req
  }
  getAll(): FakeIDBRequest<FakeRecord[]> {
    const req = new FakeIDBRequest<FakeRecord[]>()
    req.result = [...this.store.values()]
    setTimeout(() => req.onsuccess?.(), 0)
    return req
  }
  delete(id: string): FakeIDBRequest<void> {
    this.store.delete(id)
    const req = new FakeIDBRequest<void>()
    setTimeout(() => req.onsuccess?.(), 0)
    return req
  }
}

class FakeIDBTransaction {
  store: FakeIDBObjectStore
  objectStore: () => FakeIDBObjectStore
  constructor(_name: string, _mode: string) {
    this.store = new FakeIDBObjectStore()
    this.objectStore = () => this.store
  }
}

class FakeIDBDatabase {
  // Persistent storage keyed by store name. Each put/get references the same store within a tx.
  txStore: FakeIDBObjectStore | null = null
  stores = new Map<string, FakeIDBObjectStore>()

  transaction(name: string, mode: string): FakeIDBTransaction {
    const tx = new FakeIDBTransaction(name, mode)
    // Persist store reference across put/get within the same transaction
    let store = this.stores.get(name)
    if (!store) {
      store = new FakeIDBObjectStore()
      this.stores.set(name, store)
    }
    const created = store ?? new FakeIDBObjectStore()
    if (!store) this.stores.set(name, created)
    tx.objectStore = () => created
    return tx
  }
  objectStoreNames = {
    contains: () => true,
  } as unknown as { contains: (name: string) => boolean }
}

interface FakeIndexedDB {
  open: () => FakeIDBRequest<FakeIDBDatabase>
}

function setupFakeIDB() {
  const db = new FakeIDBDatabase()
  ;(globalThis as unknown as { indexedDB: FakeIndexedDB }).indexedDB = {
    open: () => {
      const req = new FakeIDBRequest<FakeIDBDatabase>()
      req.result = db
      setTimeout(() => req.onsuccess?.(), 0)
      return req
    },
  }
}

describe('IndexedDBStorageAdapter', () => {
  beforeEach(() => {
    setupFakeIDB()
  })

  it('isIndexedDBAvailable returns true when indexedDB is defined', () => {
    expect(isIndexedDBAvailable()).toBe(true)
  })

  it('create returns record with id and timestamps', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const rec = await adapter.create('ingredient', {
      id: 'ing-1',
      instance_id: 'inst1',
      name: 'Tomato',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    expect(rec.id).toBe('ing-1')
    expect(rec.instance_id).toBe('inst1')
  })

  it('get returns record by id, filters by instance_id', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await adapter.create('ingredient', {
      id: 'ing-2',
      instance_id: 'inst1',
      name: 'Tomato',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    const found = await adapter.get('ingredient', 'ing-2', 'inst1')
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Tomato')

    const cross = await adapter.get('ingredient', 'ing-2', 'inst2')
    expect(cross).toBeNull()
  })

  it('del removes record and returns true; false if instance_id mismatch', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await adapter.create('ingredient', {
      id: 'ing-3',
      instance_id: 'inst1',
      name: 'Garlic',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    const ok = await adapter.del('ingredient', 'ing-3', 'inst1')
    expect(ok).toBe(true)
    const notFound = await adapter.get('ingredient', 'ing-3', 'inst1')
    expect(notFound).toBeNull()

    const cross = await adapter.del('ingredient', 'ing-3', 'inst2')
    expect(cross).toBe(false)
  })
})
