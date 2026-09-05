// site/src/lib/indexeddb.ts — IndexedDB storage adapter for domain.ts
// Implements the same StorageAdapter interface as MemoryAdapter (and D1).
// Used in browser PWA offline mode. Auto-selected by domain.ts when indexedDB is available.

import type { DomainRecord, StorageAdapter } from './domain'

const DB_NAME = 'gos-domain'
const DB_VERSION = 1
const STORES = [
  'recipes',
  'ingredients',
  'vitamins',
  'conditions',
  'diets',
  'substances',
  'tips',
  'techniques',
] as const

type EntityStore = (typeof STORES)[number]

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available (SSR or unsupported browser)'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      }
    }
  })
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export class IndexedDBStorageAdapter implements StorageAdapter {
  async create(entity: string, record: DomainRecord): Promise<DomainRecord> {
    const db = await openDB()
    const tx = db.transaction(entity as EntityStore, 'readwrite')
    const store = tx.objectStore(entity as EntityStore)
    await promisifyRequest(
      store.put({ ...record, updated_at: new Date().toISOString() }),
    )
    return record
  }

  async list(entity: string, instanceId: string): Promise<DomainRecord[]> {
    const db = await openDB()
    const tx = db.transaction(entity as EntityStore, 'readonly')
    const store = tx.objectStore(entity as EntityStore)
    const all = await promisifyRequest<DomainRecord[]>(
      store.getAll() as IDBRequest<DomainRecord[]>,
    )
    return (all || []).filter((r) => r.instance_id === instanceId)
  }

  async get(
    entity: string,
    id: string,
    instanceId: string,
  ): Promise<DomainRecord | null> {
    const db = await openDB()
    const tx = db.transaction(entity as EntityStore, 'readonly')
    const store = tx.objectStore(entity as EntityStore)
    const record = await promisifyRequest<DomainRecord | undefined>(
      store.get(id),
    )
    if (!record) return null
    if (record.instance_id !== instanceId) return null
    return record
  }

  async update(
    entity: string,
    id: string,
    patch: Record<string, unknown>,
    instanceId: string,
  ): Promise<DomainRecord | null> {
    const db = await openDB()
    const tx = db.transaction(entity as EntityStore, 'readwrite')
    const store = tx.objectStore(entity as EntityStore)
    const cur = await promisifyRequest<DomainRecord | undefined>(store.get(id))
    if (!cur || cur.instance_id !== instanceId) return null
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() }
    await promisifyRequest(store.put(next))
    return next
  }

  async del(entity: string, id: string, instanceId: string): Promise<boolean> {
    const db = await openDB()
    const tx = db.transaction(entity as EntityStore, 'readwrite')
    const store = tx.objectStore(entity as EntityStore)
    const cur = await promisifyRequest<DomainRecord | undefined>(store.get(id))
    if (!cur || cur.instance_id !== instanceId) return false
    await promisifyRequest(store.delete(id))
    return true
  }
}

// Auto-detect helper for domain.ts
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
