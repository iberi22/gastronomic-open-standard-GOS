// Tests de AUDITORIA (no forman parte del contrato de la ola anterior).
// Objetivo: medir con evidencia, no por lectura, tres sospechas concretas
// del informe docs/audit/ROBUSTEZ-AGENTE-PWA.md:
//
//  A) /api/ai/ask toma `used` y `tierId` del body del cliente -> se puede
//     saltar el corte de cuota y declararse un tier superior al que
//     corresponde.
//  B) offline-seed.ts: isSeeded() consulta el store 'recipe', que NO existe
//     en STORES ('recipes'), y seedFromStaticBuild() no tiene ningún
//     llamador en producción.
//  C) indexeddb.ts: el bucle de reparación no asigna onblocked, y openDB()
//     devuelve una conexión que nadie cierra.
//
// Estos tests NO se tocan en la revisión adversarial: son la línea base del
// hallazgo. Si uno falla, el hallazgo es más fuerte, no más débil.

import { join } from 'node:path'
import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { canAffordInference, creditStatus } from './billing'
import { askGrounded, type GosSource } from './llm'

const ALICINA: GosSource = {
  kind: 'substance',
  id: 'alicina',
  label: 'Alicina',
  snippet: 'Picante umami, se degrada con calor',
}

// ---------------------------------------------------------------------------
// A) El peaje por tier: used y tierId viajan en el body del cliente.
// ---------------------------------------------------------------------------

/**
 * Réplica exacta de la línea 304 de site/src/pages/api/ai/ask.ts:
 *   const used = Number.isFinite(Number(body.used)) ? Number(body.used) : 0
 * Si esto no filtra, el endpoint acepta cualquier ledger que el cliente
 * mande, incluidos negativos.
 */
function usedFromClientBody(body: { used?: unknown }): number {
  return Number.isFinite(Number(body.used)) ? Number(body.used) : 0
}

describe('AUDIT A · el peaje por tier se puede falsear desde el body', () => {
  it('acepta un `used` negativo (no hay clamp a >= 0)', () => {
    const used = usedFromClientBody({ used: -1_000_000_000 })
    expect(used).toBe(-1_000_000_000)
    // Con crédito negativo, el "restante" es ilimitado:
    expect(creditStatus(used, 'socio').remaining).toBe(1_000_050_000)
    expect(canAffordInference(10_000_000, used, 'socio')).toBe(true)
  })

  it('acepta un `used` de NaN-ish que cae a 0 y `used` como string numérico', () => {
    expect(usedFromClientBody({ used: 'abc' })).toBe(0)
    expect(usedFromClientBody({ used: '49999' })).toBe(49999)
  })

  it('un cliente free puede declararse socio-managed y obtener el tier máximo', async () => {
    // normalizeTier() en ask.ts: `s in TIERS ? s : 'free'` — no hay sesión,
    // no hay cookie, no hay nada que ate el tier a una identidad. Lo único
    // que decide el tier es el string que llegue en el body.
    const free = await askGrounded({
      question: 'alicia',
      sources: [ALICINA],
      tierId: 'free',
    })
    let llmWasCalled = false
    const escalated = await askGrounded({
      question: 'alicia',
      sources: [ALICINA],
      tierId: 'socio-managed',
      llm: async () => {
        llmWasCalled = true
        return {
          text: 'La alicina se degrada con calor. [substance:alicina]',
          model: 'stub',
          via: 'local',
        }
      },
    })
    // free nunca llega a la rama que rellena `credit` (retorna antes):
    expect(free.status).toBe('answered')
    expect(free.model).toBe('retrieval-free') // NO se llamó al LLM
    // El MISMO cliente, cambiando solo el string del body, sí llega a la
    // inferencia y consume el ledger del tier más caro:
    expect(llmWasCalled).toBe(true)
    expect(escalated.status).toBe('answered')
    expect(escalated.credit?.limit).toBe(50_000)
    expect(escalated.credit?.used).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// B) offline-seed: store equivocado en isSeeded() + módulo muerto.
// ---------------------------------------------------------------------------

describe('AUDIT B · isSeeded() consulta un store que no existe', () => {
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
      // Esto es EXACTAMENTE lo que hace isSeeded() -> adapter.list('recipe', ...)
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

  it('isSeeded() devuelve false aunque la base esté llena (el catch lo traga)', async () => {
    const f = new IDBFactory()
    const prev = globalThis.indexedDB
    globalThis.indexedDB = f
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = f.open('audit-b2', 1)
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
      // Retorna false: el error NotFoundError lo captura el try/catch vacío.
      expect(await isSeeded()).toBe(false)
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
