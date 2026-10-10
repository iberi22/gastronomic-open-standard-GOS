// site/src/lib/indexeddb-schema.test.ts — CONTRATO del esquema de IndexedDB.
//
// Por qué este archivo existe: el vault pidió una vez el object store 'recipe'
// (singular) cuando el que de verdad se crea es 'recipes'. Los tests pasaron en
// verde —el fake artesanal de indexeddb.test.ts creaba stores bajo demanda y
// `contains: () => true` nunca miraba el esquema— y el fallo solo apareció en un
// navegador real, con un "este navegador no expone IndexedDB" que mentía: la DB
// estaba perfectamente sana.
//
// Aquí ya no hay fake. Se usa fake-indexeddb (implementación de la spec, con
// upgrade real, `objectStoreNames` real y NotFoundError real ante un store
// inexistente), así que el esquema se abre de verdad y se lee de verdad. Si
// alguien reintroduce el singular, o cambia un nombre de store, esto falla.
//
// Estos tests son parte del contrato, no cobertura opcional: el nombre del store
// es la frontera entre el código y el disco del usuario.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { IndexedDBStorageAdapter } from './indexeddb'
import {
  VAULT_EXPORT_FORMAT,
  VAULT_INSTANCE,
  vaultCreate,
  vaultDelete,
  vaultExport,
  vaultImport,
  vaultList,
  vaultUpdate,
} from './recipe-vault'

// Estos nombres son la verdad: deben coincidir con lo que indexeddb.ts CREA en
// onupgradeneeded. Si los dos lados se mueven, este archivo se mueve con ellos —
// pero nunca se separan en silencio.
const EXPECTED_STORES = [
  'recipes',
  'ingredients',
  'vitamins',
  'conditions',
  'diets',
  'substances',
  'tips',
  'techniques',
] as const

const DB_NAME = 'gos-domain'
const DB_VERSION = 1

/** Nombres que la app NUNCA debe pedir. El singular es el bug histórico. */
const FORBIDDEN_STORE_NAMES = [
  'recipe',
  'ingredient',
  'vitamin',
  'condition',
  'diet',
  'substance',
  'tip',
  'technique',
] as const

const VALID_RECIPE = {
  title: 'Arepas de choclo',
  main_ingredients: ['Maíz dulce', 'Queso fresco'],
  instructions: ['Licuar la masa', 'Cocinar a fuego medio'],
}

function openRealDB(): Promise<IDBDatabase> {
  // Se abre SIN fijar version a proposito. openDB() repara una base Sterling
  // subiendo la version, asi que despues de reparar la base ya no esta en
  // DB_VERSION: pedirla fijada daria VersionError y el test mediria su propia
  // assertion, no el esquema. Sin version se abre en la que hay, que es lo
  // que se quiere inspeccionar.
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function transactionNames(db: IDBDatabase): string[] {
  return [...db.objectStoreNames]
}

describe('Contrato del esquema de IndexedDB (IndexedDB real vía fake-indexeddb)', () => {
  // Cada test arranca de una fábrica vacía: sin estado compartido entre tests.
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  afterEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  it('crea exactamente los object stores que el vault espera (plurales)', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    const db = await openRealDB()
    const names = transactionNames(db)
    db.close()

    // Orden por set para no depender del orden de creación.
    expect(new Set(names)).toEqual(new Set(EXPECTED_STORES))
    // El que importa de verdad: el store del vault, en plural.
    expect(names).toContain('recipes')
  })

  it('NO crea ningún store en singular (el bug histórico no vuelve)', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    const db = await openRealDB()
    const names = transactionNames(db)
    db.close()

    for (const forbidden of FORBIDDEN_STORE_NAMES) {
      expect(names).not.toContain(forbidden)
    }
  })

  it('el store "recipes" usa keyPath "id", la clave que espera el vault', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    const db = await openRealDB()
    const tx = db.transaction('recipes', 'readonly')
    const store = tx.objectStore('recipes')
    const keyPath = store.keyPath
    const autoIncrement = store.autoIncrement
    db.close()

    expect(keyPath).toBe('id')
    expect(autoIncrement).toBe(false)
  })

  it('abrir un store inexistente falla, igual que en el navegador real', async () => {
    // El esquema solo se crea en el upgrade, así que hay que provocar una
    // escritura del vault primero (si no, la DB está vacía y 'recipes' tampoco
    // existiría todavía).
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    // Este es el test que habría atrapado el bug: contra el fake artesanal
    // `objectStoreNames.contains` devolvía true para cualquier nombre.
    const db = await openRealDB()
    expect(db.objectStoreNames.contains('recipes')).toBe(true)
    expect(db.objectStoreNames.contains('recipe')).toBe(false)
    expect(db.objectStoreNames.contains('receta')).toBe(false)

    // Y pedir una transacción sobre el store inexistente lanza NotFoundError,
    // que es exactamente lo que veía el navegador en el fallo original.
    let thrown: unknown = null
    try {
      db.transaction('recipe', 'readonly')
    } catch (err) {
      thrown = err
    }
    db.close()
    expect(thrown).not.toBeNull()
    expect((thrown as { name?: string }).name).toBe('NotFoundError')
  })

  it('el esquema NO se crea en un upgrade de una versión futura', async () => {
    // Guarda: si alguien sube DB_VERSION sin migrar, el vault debe fallar en
    // vez de mostrar un vault vacío sin explicación.
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION + 1)
      req.onupgradeneeded = () => {
        // Sin onupgradeneeded que cree stores: la DB existe pero está vacía.
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(transactionNames(db)).toEqual([])
    db.close()
  })

  it('B2: repara desde la versión REAL del disco, no desde la pedida', async () => {
    // db.version puede ser MAYOR que la version que se pidio, si otra
    // conexion subio la base entre medias. Reparar a `version + 1` en vez de
    // `db.version + 1` daria VersionError en bucle. Este caso es el que
    // distingue las dos formulas, asi que va cubierto aqui explicitamente.
    // (Con la mutacion `destino = version + 1`, este test es el que falla.)
    globalThis.indexedDB = new IDBFactory()

    // Base en v3, esteril: dos pasos de subida desde DB_VERSION=1.
    const seed = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION + 2)
      req.onupgradeneeded = () => {}
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(transactionNames(seed)).toEqual([])
    seed.close()

    // openDB arranca pidiendo DB_VERSION=1 sobre una base en v3 -> VersionError
    // -> reintenta v2 -> VersionError -> reintenta v3 -> sin stores -> repara.
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    const db = await openRealDB()
    expect(new Set(transactionNames(db))).toEqual(new Set(EXPECTED_STORES))
    db.close()
  })

  it('se autorepara si la base existe en la versión correcta pero sin stores', async () => {
    // Fallback real, encontrado probando en navegador: una base 'gos-domain' en
    // v1 sin stores (creada por una sonda, por una versión vieja del código, o
    // por un borrado a medias) NO dispara onupgradeneeded —ya no hay upgrade—
    // así que toda operación moría con NotFoundError y la UI culpaba al
    // navegador con un "este navegador no expone IndexedDB" falso.
    const barren = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        // Sin createObjectStore: base estéril en la versión correcta.
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(transactionNames(barren)).toEqual([])
    barren.close()

    // El vault debe reconstruirse solo, sin pedirle nada al usuario.
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    const db = await openRealDB()
    expect(new Set(transactionNames(db))).toEqual(new Set(EXPECTED_STORES))
    db.close()
    expect(await vaultList(adapter, VAULT_INSTANCE)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Contrato de dos pestañas (informe docs/audit/ROBUSTEZ-AGENTE-PWA.md §1.4)
//
// Las cinco rutas del adaptador (create/list/get/update/del) hacen
// `await openDB()` y ninguna cerraba la conexión: cada operación abría una
// nueva y la filtraba. Con otra pestaña pidiendo una subida de versión, el
// evento `versionchange` llega a esas conexiones y nadie las cierra, así que
// la subida queda bloqueada para siempre. No es un error: es un cuelgue, y la
// segunda pestaña se queda en spinner sin decir nada.
//
// Estos tests miden el contrato al revés de como lo medía la auditoría: aquí
// la pestaña nueva TIENE que llegar a abrir.
// ---------------------------------------------------------------------------

describe('Dos pestañas: las conexiones de este módulo no bloquean a los demás', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  /** Abre 'gos-domain' en `version` sin crear stores, como haría otra pestaña. */
  function otraPestanaSube(version: number): Promise<string> {
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, version)
      req.onupgradeneeded = () => {
        // Sin stores: solo importa subir la versión.
      }
      req.onsuccess = () => {
        req.result.close()
        resolve('onsuccess')
      }
      req.onerror = () => resolve(`onerror:${req.error?.name}`)
      req.onblocked = () => resolve('onblocked')
      setTimeout(() => resolve('PENDIENTE-SIN-RESOLVER'), 1000)
    })
  }

  it('la conexión que abre el vault se cierra y deja subir a la otra pestaña', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    // Sin cerrar, la subida de versión de la otra pestaña se bloquea.
    expect(await otraPestanaSube(DB_VERSION + 2)).toBe('onsuccess')
  })

  it('después de que otra pestaña suba la versión, el vault sigue funcionando', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)
    expect(await otraPestanaSube(DB_VERSION + 1)).toBe('onsuccess')

    // La base está ahora en v2. Abrir pidiendo DB_VERSION da VersionError y
    // openDB() debe subir, no quedarse colgado ni fallar.
    await expect(vaultList(adapter, VAULT_INSTANCE)).resolves.toHaveLength(1)
    const updated = await vaultUpdate(
      adapter,
      VAULT_INSTANCE,
      (await vaultList(adapter, VAULT_INSTANCE))[0].id,
      VALID_RECIPE,
    )
    expect(updated.ok).toBe(true)
  })
})

describe('Regresión singular/plural: el nombre que pide el código es el que existe', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  it('vaultCreate escribe en "recipes" y se puede leer de ahí', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const created = await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)
    expect(created.ok).toBe(true)
    const id = created.records?.[0].id as string

    // Lectura directa del store correcto, saltándonos el adapter: si el vault
    // escribiera en 'recipe', aquí no habría nada.
    const db = await openRealDB()
    const readBack = await new Promise<unknown>((resolve, reject) => {
      const req = db
        .transaction('recipes', 'readonly')
        .objectStore('recipes')
        .get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    expect(readBack).not.toBeUndefined()
  })

  it('el vault NO escribe nada en el store singular "recipe"', async () => {
    const adapter = new IndexedDBStorageAdapter()
    await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)

    const db = await openRealDB()
    // 'recipe' ni existe, así que ni se puede mirar: pero su ausencia es la
    // prueba. Si algún día 'recipe' apareciera, el expect de arriba lo cazaría.
    expect(db.objectStoreNames.contains('recipe')).toBe(false)

    // Y el total de recetas en 'recipes' es exactamente 1 (no duplicado).
    const count = await new Promise<number>((resolve, reject) => {
      const req = db
        .transaction('recipes', 'readonly')
        .objectStore('recipes')
        .count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    expect(count).toBe(1)
  })

  it('el ciclo completo vault solo toca stores que existen (create/list/update/delete/import/export)', async () => {
    const adapter = new IndexedDBStorageAdapter()

    // list
    await expect(vaultList(adapter, VAULT_INSTANCE)).resolves.toEqual([])

    // create
    const created = await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)
    expect(created.ok).toBe(true)
    const id = created.records?.[0].id as string

    // update
    await expect(
      vaultUpdate(adapter, VAULT_INSTANCE, id, {
        ...VALID_RECIPE,
        title: 'Arepas de choclo mejoradas',
      }),
    ).resolves.toMatchObject({ ok: true })

    // export (puro, sin storage)
    const rows = await vaultList(adapter, VAULT_INSTANCE)
    const { json } = vaultExport(rows, '2026-01-01T00:00:00.000Z')
    expect(JSON.parse(json).recipes).toHaveLength(1)

    // import
    const imported = await vaultImport(adapter, VAULT_INSTANCE, json, rows)
    expect(imported.ok).toBe(true)
    expect(imported.imported).toBe(1)

    // delete
    await expect(
      vaultDelete(adapter, VAULT_INSTANCE, id),
    ).resolves.toMatchObject({ ok: true })
  })
})

describe('Importar un JSON arbitrario no rompe el vault (IndexedDB real)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  /** Envuelve cualquier cosa como si fuera un export del vault. */
  const forge = (recipes: unknown) =>
    JSON.stringify({
      format: VAULT_EXPORT_FORMAT,
      version: 1,
      exported_at: '2026-01-01T00:00:00.000Z',
      recipes,
    })

  it('rechaza payloads que no son del vault y no toca la base', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const payloads: Array<[string, string]> = [
      ['texto vacío', ''],
      ['json roto', '{no json'],
      ['array sueltos', '[1,2,3]'],
      ['null', 'null'],
      [
        'formato ajeno',
        JSON.stringify({ format: 'ataque', version: 1, recipes: [] }),
      ],
      [
        'version 99',
        forge([VALID_RECIPE]).replace('"version":1', '"version":99'),
      ],
      [
        'recipes no es lista',
        JSON.stringify({
          format: VAULT_EXPORT_FORMAT,
          version: 1,
          recipes: 'nope',
        }),
      ],
    ]
    for (const [label, payload] of payloads) {
      const res = await vaultImport(adapter, VAULT_INSTANCE, payload)
      expect(res.ok, label).toBe(false)
      expect(res.error, label).toBeTruthy()
      expect(res.imported, label).toBe(0)
    }
    // Nada se coló en el store.
    expect(await vaultList(adapter, VAULT_INSTANCE)).toEqual([])
  })

  it('descarta recetas basura sin tirar el resto del archivo', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const res = await vaultImport(
      adapter,
      VAULT_INSTANCE,
      forge([
        null,
        'una cadena',
        42,
        [],
        { title: 'sin ingredientes', main_ingredients: [] },
        {
          title: 'Solo relleno',
          main_ingredients: ['Ingrediente principal 1'],
        },
        { title: 'Buena', main_ingredients: ['Maíz dulce'] },
      ]),
    )
    expect(res.ok).toBe(true)
    expect(res.imported).toBe(1)
    expect(res.rejected).toBe(6)

    const rows = await vaultList(adapter, VAULT_INSTANCE)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Buena')
  })

  it('no sufre contaminación de prototipo con "__proto__" ni "constructor"', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const res = await vaultImport(
      adapter,
      VAULT_INSTANCE,
      forge([
        {
          title: 'Con prototipo sucio',
          main_ingredients: ['Maíz dulce'],
          __proto__: { polluted: true },
          constructor: { prototype: { polluted: true } },
        },
      ]),
    )
    expect(res.ok).toBe(true)

    // Ni Object.prototype ni nada global queda marcado.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(
      (Object.prototype as Record<string, unknown>).polluted,
    ).toBeUndefined()

    // Y lo que se guardó es una receta normal, sin campos inyectados.
    const rows = await vaultList(adapter, VAULT_INSTANCE)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Con prototipo sucio')
    expect(rows[0].polluted).toBeUndefined()
  })

  it('un título con HTML se guarda como texto plano, no como marcado', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const nasty =
      '<script>globalThis.__pwned = 1</script><img src=x onerror=alert(1)>'
    const res = await vaultImport(
      adapter,
      VAULT_INSTANCE,
      forge([{ title: nasty, main_ingredients: ['Maíz dulce'] }]),
    )
    expect(res.ok).toBe(true)

    const rows = await vaultList(adapter, VAULT_INSTANCE)
    // Se conserva literal (el componente lo escapa al renderizar).
    expect(rows[0].title).toBe(nasty)
    // Y el módulo no ejecutó nada.
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined()
  })

  it('el componente Svelte no usa {@html}: el escape lo da el framework', async () => {
    // Guard estructural: si alguien mete {@html} en el vault, el título de una
    // receta importada dejaría de ser texto y pasaría a ser marcado ejecutable.
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const code = readFileSync(
      resolve(process.cwd(), 'src/components/RecipeVault.svelte'),
      'utf8',
    )
    expect(code).not.toMatch(/\{@html/)
  })

  it('importar nunca pisa una receta local aunque el archivo traiga su id', async () => {
    const adapter = new IndexedDBStorageAdapter()
    const local = await vaultCreate(adapter, VAULT_INSTANCE, VALID_RECIPE)
    const localId = local.records?.[0].id as string
    expect(localId).toBeTruthy()

    // Un archivo malicioso que quiere adoptar el id de la receta local.
    const res = await vaultImport(
      adapter,
      VAULT_INSTANCE,
      JSON.stringify({
        format: VAULT_EXPORT_FORMAT,
        version: 1,
        exported_at: '2026-01-01T00:00:00.000Z',
        recipes: [
          {
            id: localId,
            instance_id: VAULT_INSTANCE,
            ...VALID_RECIPE,
            title: 'Suplantada',
          },
        ],
      }),
      await vaultList(adapter, VAULT_INSTANCE),
    )
    expect(res.ok).toBe(true)
    expect(res.records?.[0].id).not.toBe(localId)

    const rows = await vaultList(adapter, VAULT_INSTANCE)
    expect(rows).toHaveLength(2)
    // La original conserva su título.
    expect(rows.find((r) => r.id === localId)?.title).toBe(VALID_RECIPE.title)
  })
})
