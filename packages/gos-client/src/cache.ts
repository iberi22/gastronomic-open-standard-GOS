import type { CacheAdapter } from './types.js'

export function memoryCache(): CacheAdapter {
  const entries = new Map<string, unknown>()
  return {
    async get<T>(key: string) {
      return structuredClone(entries.get(key)) as T | undefined
    },
    async set<T>(key: string, value: T) {
      entries.set(key, structuredClone(value))
    },
  }
}

/** Lazy opening keeps this adapter safe to construct during server rendering. */
export function indexedDbCache(dbName = 'gos-client'): CacheAdapter {
  let opening: Promise<IDBDatabase> | undefined
  function open() {
    if (!opening) {
      opening = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1)
        request.onupgradeneeded = () =>
          request.result.createObjectStore('entries')
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close()
            opening = undefined
          }
          resolve(request.result)
        }
        request.onerror = () => reject(request.error)
      }).catch((error) => {
        opening = undefined
        throw error
      })
    }
    return opening
  }
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const db = await open()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('entries', 'readonly')
        const request = transaction.objectStore('entries').get(key)
        transaction.oncomplete = () => resolve(request.result as T | undefined)
        transaction.onabort = () => reject(transaction.error)
        transaction.onerror = () => reject(transaction.error)
      })
    },
    async set<T>(key: string, value: T) {
      const db = await open()
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('entries', 'readwrite')
        transaction.objectStore('entries').put(value, key)
        transaction.oncomplete = () => resolve()
        transaction.onabort = () => reject(transaction.error)
        transaction.onerror = () => reject(transaction.error)
      })
    },
  }
}
