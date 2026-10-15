// Hardening del gateway ABIERTO de GOS.
//
// Este archivo ya no prueba autenticacion de keys (el gateway dejo de leerlas el
// 2026-10-15). Lo que queda blindado es lo que SI sigue siendo necesario una vez
// que la API es publica: el limite anonimo antiabuso (rafaga + cuota diaria) no
// se puede saltar, el cache no toca D1, y las mutaciones no llegan al origen.

import { describe, expect, it, vi } from 'vitest'
import worker from '../src/index'
import { createFakeD1, type FakeD1 } from './d1-fake'

const GW = 'https://gos-api-gateway.test'

/** Mock del Rate Limiting binding: ventana fija sin reloj, N por clave. */
function fakeRL(limit: number) {
  const m = new Map<string, number>()
  const calls: string[] = []
  return {
    m,
    calls,
    async limit({ key }: { key: string }) {
      calls.push(key)
      const n = (m.get(key) ?? 0) + 1
      m.set(key, n)
      return { success: n <= limit }
    },
  }
}

function countingDb(fake: FakeD1) {
  const c = { prepares: 0, sqls: [] as string[] }
  const db = {
    prepare(sql: string) {
      c.prepares++
      c.sqls.push(sql)
      return fake.db.prepare(sql)
    },
  }
  return { db, c }
}

function setup() {
  const fake = createFakeD1({ applySchema: true })
  const { db, c } = countingDb(fake)
  const env = { ORIGIN_URL: 'https://origin.test', DB: db }
  return { fake, env, c }
}

describe('limite anonimo: rafaga por IP (binding), sin D1 ni KV', () => {
  const origin = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
    )
  const get = (path: string, env: unknown, ip = '5.5.5.5') =>
    worker.fetch(
      new Request(`${GW}${path}`, { headers: { 'cf-connecting-ip': ip } }),
      env as never,
    )

  it('rutas estaticas nunca tocan D1 (ni KV): cache primero, sin prepare()', async () => {
    const { env, c } = setup()
    const store = new Map<string, Response>()
    vi.stubGlobal('caches', {
      default: {
        match: async (r: Request) => store.get(r.url)?.clone(),
        put: async (r: Request, res: Response) => {
          store.set(r.url, res)
        },
      },
    })
    origin()
    const kv = { get: vi.fn(), put: vi.fn() }
    const e = { ...env, RATE_LIMIT_KV: kv, RL_FREE_BURST: fakeRL(1000) }
    for (const p of [
      '/api/all.json',
      '/api/by-country/mx.json',
      '/api/v1/recipes',
      '/graph-data.json',
    ]) {
      expect((await get(p, e)).status).toBe(200)
    }
    // segunda lectura: viene de cache, el origen no se vuelve a llamar
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const calls = f.mock.calls.length
    expect((await get('/api/all.json', e)).status).toBe(200)
    expect(f.mock.calls.length).toBe(calls)
    vi.unstubAllGlobals()
    expect(c.prepares).toBe(0)
    expect(kv.get).not.toHaveBeenCalled()
    expect(kv.put).not.toHaveBeenCalled()
  })

  it('rafaga: superado el limite del binding responde 429 sin D1 ni origen', async () => {
    const { env, c } = setup()
    origin()
    const e = { ...env, RL_FREE_BURST: fakeRL(3) }
    const st: number[] = []
    for (let i = 0; i < 5; i++) st.push((await get('/api/all.json', e)).status)
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    expect(f.mock.calls.length).toBe(3)
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 200, 429, 429])
    expect(c.prepares).toBe(0)
  })

  it('rafaga: es por IP y no por credencial (todos son anonimos)', async () => {
    const { env } = setup()
    origin()
    const e = { ...env, RL_FREE_BURST: fakeRL(1) }
    expect((await get('/api/all.json', e, '1.1.1.1')).status).toBe(200)
    expect((await get('/api/all.json', e, '1.1.1.1')).status).toBe(429)
    expect((await get('/api/all.json', e, '2.2.2.2')).status).toBe(200)
    vi.unstubAllGlobals()
  })

  it('una cabecera x-api-key no cambia NADA: misma rafaga, mismo 200', async () => {
    const { env, c } = setup()
    origin()
    const rl = fakeRL(1)
    const e = { ...env, RL_FREE_BURST: rl }
    const withKey = await worker.fetch(
      new Request(`${GW}/api/all.json`, { headers: { 'x-api-key': 'socio' } }),
      e as never,
    )
    const anonymous = await worker.fetch(
      new Request(`${GW}/api/all.json`),
      e as never,
    )
    vi.unstubAllGlobals()
    expect(withKey.status).toBe(200)
    expect(anonymous.status).toBe(429)
    // El claim de una key no se consulta en ningun sitio (ni D1 ni billing).
    expect(c.sqls.some((q) => q.includes('api_keys'))).toBe(false)
  })

  it('cuota diaria en D1: un UPSERT por peticion no estatica y 429 al agotarse', async () => {
    const { fake, env, c } = setup()
    origin()
    const e = { ...env, FREE_DAILY_LIMIT: '3' }
    const st: number[] = []
    let last: Response | undefined
    for (let i = 0; i < 5; i++) {
      last = await get('/api/entities/recipe', e)
      st.push(last.status)
    }
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 200, 429, 429])
    expect(last?.headers.get('retry-after')).toBe('86400')
    expect(c.sqls.filter((q) => q.includes('free_quota'))).toHaveLength(5)
    const row = await fake.db
      .prepare('SELECT ip_key, n FROM free_quota')
      .all<{ ip_key: string; n: number }>()
    expect(row.results).toHaveLength(1)
    expect(row.results?.[0].n).toBe(3)
    expect(row.results?.[0].ip_key).not.toContain('5.5.5.5')
  })

  it('cuota diaria: concurrencia atomica, caben exactamente 4 de 10', async () => {
    const { env } = setup()
    origin()
    const e = { ...env, FREE_DAILY_LIMIT: '4' }
    const rs = await Promise.all(
      Array.from({ length: 10 }, () => get('/api/entities/x', e)),
    )
    vi.unstubAllGlobals()
    expect(rs.filter((r) => r.status === 200)).toHaveLength(4)
  })

  it('D1 caida en la cuota free: falla abierto, la rafaga sigue protegiendo', async () => {
    const { env } = setup()
    origin()
    const bad = createFakeD1({ mode: 'throws', applySchema: true })
    const r = await get('/api/entities/recipe', { ...env, DB: bad.db })
    vi.unstubAllGlobals()
    expect(r.status).toBe(200)
  })

  it('sin binding DB la cuota diaria no existe, pero la rafaga sigue (fail-open + burst)', async () => {
    origin()
    const e = { ORIGIN_URL: 'https://origin.test', RL_FREE_BURST: fakeRL(2) }
    const st: number[] = []
    for (let i = 0; i < 4; i++)
      st.push((await get('/api/entities/x', e)).status)
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 429, 429])
  })
})

describe('solo lectura: ninguna mutacion llega al origen', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s se rechaza con 405 y el origen no se llama',
    async (method) => {
      const { env } = setup()
      const f = vi.fn(async () => new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', f)
      const res = await worker.fetch(
        new Request(`${GW}/api/entities/recipe?id=1`, {
          method,
          body: method === 'DELETE' ? undefined : '{}',
        }),
        env as never,
      )
      vi.unstubAllGlobals()
      expect(res.status).toBe(405)
      expect(res.headers.get('allow')).toBe('GET, HEAD, OPTIONS')
      expect(f).not.toHaveBeenCalled()
    },
  )

  it('GET sigue sirviendo datos abiertos', async () => {
    const { env } = setup()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    )
    const res = await worker.fetch(
      new Request(`${GW}/api/entities/recipe`),
      env as never,
    )
    vi.unstubAllGlobals()
    expect(res.status).toBe(200)
  })
})

describe('?key= heredado', () => {
  it('?key= no se reenvia al origen ni cambia el tratamiento', async () => {
    const { env } = setup()
    const f = vi.fn(async (_u: string) => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const res = await worker.fetch(
      new Request(`${GW}/api/all.json?key=gs_key_alpha&x=1`),
      env as never,
    )
    vi.unstubAllGlobals()
    expect(res.status).toBe(200)
    expect(f).toHaveBeenCalledTimes(1)
    const url = String(f.mock.calls[0][0])
    expect(url).not.toContain('key=')
    expect(url).toContain('x=1')
  })
})
