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

    // Reparacion. Hay dos motivos por los que la version de apertura tiene
    // que iterar:
    //
    //  1. La base existe en DB_VERSION pero le falta un store (creada por una
    //     sonda, por una version vieja del esquema o por un borrado a medias).
    //     onupgradeneeded solo corre al SUBIR de version, asi que no se
    //     dispara nada y db.transaction('recipes') revienta con
    //     "No objectStore named recipes". Ese fue el fallo que dejo el vault
    //     roto en un navegador con los tests en verde. Medido con
    //     fake-indexeddb: subir de version si crea lo que falte.
    //
    //  2. La base esta en una version MAYOR que DB_VERSION (otra pestana, o
    //     una llamada previa de este mismo modulo que ya reparo). Pedir
    //     DB_VERSION da VersionError. Medido: abrir v1 sobre v2 -> VersionError.
    //
    // Los dos casos se resuelven subiendo la version, asi que una sola ruta
    // los cubre: se abre, se comprueba, y si hay que corregir se incrementa.
    // El limite evita un bucle infinito si algo externo bajase la version.
    const MAX_INTENTOS = STORES.length + 2

    const intentarEn = (version: number, intentos: number): void => {
      const req = indexedDB.open(DB_NAME, version)

      req.onerror = () => {
        // La base esta en una version mayor que la pedida: se sube y se
        // reintenta. Medido con fake-indexeddb: abrir v1 sobre v2 ->
        // VersionError.
        if (req.error?.name === 'VersionError' && intentos > 0) {
          intentarEn(version + 1, intentos - 1)
          return
        }
        reject(req.error)
      }

      req.onsuccess = () => {
        const db = req.result
        // Otra pestaña puede pedir una subida de version en cualquier momento
        // (reparacion, o un build con un store nuevo). Si esta conexion se queda
        // abierta, esa subida se bloquea para siempre: la otra pestaña recibe
        // `blocked`, no un error, y se queda en spinner sin decir nada. Las
        // cinco rutas del adaptador dejan la conexion abierta, asi que hay dos
        // defensas: cerrarla al terminar cada operacion, y cerrarla en cuanto
        // alguien la necesite. Medido con fake-indexeddb: sin esto, una subida
        // desde otra pestaña queda bloqueada y no resuelve nunca (test
        // 'Dos pestañas' de indexeddb-schema.test.ts).
        db.onversionchange = () => db.close()
        const faltan = STORES.filter((s) => !db.objectStoreNames.contains(s))
        if (faltan.length === 0) {
          resolve(db)
          return
        }
        if (intentos <= 0) {
          db.close()
          reject(
            new Error(
              `IndexedDB: no se pudieron crear los stores ` +
                `[${faltan.join(', ')}] tras agotar los reintentos`,
            ),
          )
          return
        }
        // Siguiente version: dispara onupgradeneeded, que si crea lo que
        // falte. Se pide version + 1 y no db.version + 1 porque por spec
        // req.result.version SIEMPRE es la version que se pidio (abrir por
        // encima de la actual sube la base exactamente a esa): son
        // equivalentes, y medido con fake-indexeddb las dos formulas dan
        // el mismo resultado incluso arrancando desde DB_VERSION sobre una
        // base en v3. La diferencia real la cubre el reintento de
        // VersionError de arriba, no esta linea.
        const destino = version + 1
        console.warn(
          `[indexeddb] faltan los stores ${faltan.join(', ')}; reparando ` +
            `a v${destino}`,
        )
        db.close()
        intentarEn(destino, intentos - 1)
      }

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' })
          }
        }
      }
    }

    intentarEn(DB_VERSION, MAX_INTENTOS)
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
    try {
      const tx = db.transaction(entity as EntityStore, 'readwrite')
      const store = tx.objectStore(entity as EntityStore)
      await promisifyRequest(
        store.put({ ...record, updated_at: new Date().toISOString() }),
      )
      return record
    } finally {
      db.close()
    }
  }

  async list(entity: string, instanceId: string): Promise<DomainRecord[]> {
    const db = await openDB()
    try {
      const tx = db.transaction(entity as EntityStore, 'readonly')
      const store = tx.objectStore(entity as EntityStore)
      const all = await promisifyRequest<DomainRecord[]>(
        store.getAll() as IDBRequest<DomainRecord[]>,
      )
      return (all || []).filter((r) => r.instance_id === instanceId)
    } finally {
      db.close()
    }
  }

  async get(
    entity: string,
    id: string,
    instanceId: string,
  ): Promise<DomainRecord | null> {
    const db = await openDB()
    try {
      const tx = db.transaction(entity as EntityStore, 'readonly')
      const store = tx.objectStore(entity as EntityStore)
      const record = await promisifyRequest<DomainRecord | undefined>(
        store.get(id),
      )
      if (!record) return null
      if (record.instance_id !== instanceId) return null
      return record
    } finally {
      db.close()
    }
  }

  async update(
    entity: string,
    id: string,
    patch: Record<string, unknown>,
    instanceId: string,
  ): Promise<DomainRecord | null> {
    const db = await openDB()
    try {
      const tx = db.transaction(entity as EntityStore, 'readwrite')
      const store = tx.objectStore(entity as EntityStore)
      const cur = await promisifyRequest<DomainRecord | undefined>(
        store.get(id),
      )
      if (!cur || cur.instance_id !== instanceId) return null
      const next = { ...cur, ...patch, updated_at: new Date().toISOString() }
      await promisifyRequest(store.put(next))
      return next
    } finally {
      db.close()
    }
  }

  async del(entity: string, id: string, instanceId: string): Promise<boolean> {
    const db = await openDB()
    try {
      const tx = db.transaction(entity as EntityStore, 'readwrite')
      const store = tx.objectStore(entity as EntityStore)
      const cur = await promisifyRequest<DomainRecord | undefined>(
        store.get(id),
      )
      if (!cur || cur.instance_id !== instanceId) return false
      await promisifyRequest(store.delete(id))
      return true
    } finally {
      db.close()
    }
  }
}

// Auto-detect helper for domain.ts
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}
