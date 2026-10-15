// Tests de AUDITORIA (no forman parte del contrato de la ola anterior).
// Objetivo: medir con evidencia, no por lectura, dos sospechas concretas
// del informe docs/audit/ROBUSTEZ-AGENTE-PWA.md:
//
//  B) offline-seed.ts: isSeeded() consulta el store 'recipe', que NO existe
//     en STORES ('recipes'), y seedFromStaticBuild() no tiene ningún
//     llamador en producción.
//  C) indexeddb.ts: el bucle de reparación no asigna onblocked, y openDB()
//     devuelve una conexión que nadie cierra.
//
// El hallazgo A (el peaje de cuota falseable desde el body) se resolvió el
// 2026-10-15 eliminando la facturación por app: ask.ts ya no acepta cuota del
// cliente y el módulo de facturación se borró. Sus tests se retiraron con el
// código.
//
// Estos tests NO se tocan en la revisión adversarial: son la línea base del
// hallazgo. Si uno falla, el hallazgo es más fuerte, no más débil.

import { join } from 'node:path'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// B) offline-seed: store equivocado en isSeeded() + módulo muerto.
// ---------------------------------------------------------------------------

describe('AUDIT B · isSeeded() verifica el store recipes', () => {
  it("'recipe' no está en STORES: la consulta SIEMPRE lanza NotFoundError", async () => {
    // STORES real, leído de la fuente para que el test no dependa de mi memoria.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(join(import.meta.dirname, 'indexeddb.ts'), 'utf8'),
    )
    // Sin asercion non-null: si el regex deja de encontrar el bloque
    // STORES, un `!` lo convertiria en un TypeError opaco en vez de un
    // fallo que dice que el contrato cambio.
    const block = src.match(/const STORES = \[([\s\S]*?)\] as const/)
    expect(
      block,
      'no se encontro el bloque STORES en indexeddb.ts',
    ).not.toBeNull()
    const stores = [...(block?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
      (m) => m[1],
    )
    expect(stores).toContain('recipes')
    expect(stores).not.toContain('recipe') // singular: el nombre que usa isSeeded

    // Y la operación real falla contra IndexedDB de verdad.
    const f = new IDBFactory()
    const prev = globalThis.indexedDB
    globalThis.indexedDB = f
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = f.open('audit-b', 1)
        r.onupgradeneeded = () => r.result.createObjectStore('recipes')
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      // Esto es lo que hacía isSeeded() -> adapter.list('recipe', ...)
      let thrown: string | null = null
      try {
        db.transaction('recipe' as never, 'readonly')
      } catch (e) {
        // DOMException de otro realm: `instanceof Error` es false aquí, así
        // que hay que leer `.name` del duck-type, no instanceof.
        const named = e as { name?: string; message?: string }
        thrown = named?.name ?? String(e)
      }
      db.close()
      expect(thrown).toBe('NotFoundError')
    } finally {
      globalThis.indexedDB = prev
    }
  })

  it('isSeeded() es un contrato con el store gos-domain y la colección recipes', async () => {
    const f = new IDBFactory()
    const prev = globalThis.indexedDB
    globalThis.indexedDB = f
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = f.open('gos-domain', 1)
        r.onupgradeneeded = () =>
          r.result.createObjectStore('recipes', { keyPath: 'id' })
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      // Base con datos de verdad en 'recipes'
      await new Promise<void>((res, rej) => {
        const tx = db.transaction('recipes', 'readwrite')
        tx.objectStore('recipes').put({ id: 'r1', instance_id: 'seed-default' })
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
      db.close()

      const { isSeeded } = await import('./offline-seed')
      expect(await isSeeded()).toBe(true)
    } finally {
      globalThis.indexedDB = prev
    }
  })
})

// ---------------------------------------------------------------------------
// C) indexeddb.ts: onblocked sin manejar + conexiones que nadie cierra.
// ---------------------------------------------------------------------------

describe('AUDIT C · el bucle de reparación no maneja onblocked', () => {
  it('la fuente NO asigna req.onblocked en ninguna rama', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(
      join(import.meta.dirname, 'indexeddb.ts'),
      'utf8',
    )
    // onblocked no aparece en el archivo: una apertura bloqueada por otra
    // pestaña no dispara onsuccess NI onerror, así que la promesa de openDB()
    // no se resuelve nunca. No es un rechazo: es un cuelgue silencioso.
    expect(src).not.toContain('onblocked')
    // Y tampoco hay ningún setTimeout/AbortController que lo corte.
    expect(src).not.toContain('AbortController')
  })

  it('el bucle está acotado: MAX_INTENTOS evita el ciclo infinito', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync(
      join(import.meta.dirname, 'indexeddb.ts'),
      'utf8',
    )
    // Constante positiva y el reintento la decrementa: el ciclo no es
    // infinito aunque STORES crezca.
    expect(src).toMatch(/const MAX_INTENTOS = STORES\.length \+ 2/)
    expect(src).toMatch(/intentarEn\(destino, intentos - 1\)/)
  })

  it('con una conexión ajena abierta, la apertura de una versión superior NO resuelve', async () => {
    const f = new IDBFactory()
    // Pestaña 1: abre la base y la deja abierta (como hace el adaptador, que
    // nunca cierra: create/list/get/update/del hacen `await openDB()` y nada más).
    const db1 = await new Promise<IDBDatabase>((res, rej) => {
      const r = f.open('audit-c', 1)
      r.onupgradeneeded = () => {
        r.result.createObjectStore('recipes')
      }
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    // db1 sigue abierta. Ahora "pestaña 2" pide la v2 (la ruta de reparación).
    const settled = await new Promise<string>((res) => {
      const r = f.open('audit-c', 2)
      let done = false
      r.onsuccess = () => {
        done = true
        r.result.close()
        res('onsuccess')
      }
      r.onerror = () => {
        done = true
        res(`onerror:${r.error?.name}`)
      }
      r.onblocked = () => res('onblocked')
      setTimeout(() => {
        if (!done) res('PENDIENTE-SIN-RESOLVER')
      }, 300)
    })
    db1.close()
    // MEDIDO: fake-indexeddb SÍ dispara onblocked (no se queda colgado en
    // el limbo), pero openDB() no le asigna handler: sin onsuccess ni
    // onerror, la promesa de openDB() nunca se resuelve NI se rechaza.
    // El resultado para la app no es un error visible, es un cuelgue.
    expect(settled).toBe('onblocked')
  })
})
