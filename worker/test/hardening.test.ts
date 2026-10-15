// Hardening del gateway ABIERTO de GOS.
//
// Este archivo ya no prueba autenticacion de keys (el gateway dejo de leerlas el
// 2026-10-15). Lo que queda blindado es lo que SI sigue siendo necesario una vez
// que la API es publica: el limite anonimo antiabuso (rafaga + cuota diaria) no
// se puede saltar, el cache no toca D1, y las mutaciones no llegan al origen.

import { describe, expect, it, vi } from 'vitest'
import worker, { __resetQuotaTableCacheForTests } from '../src/index'
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
  // Limiter de rafaga permisivo por defecto: el gateway es fail-closed, asi
  // que sin binding TODA peticion seria 503. Cada test que quiera medir la
  // rafaga lo sobreescribe con su propio fakeRL.
  const env = {
    ORIGIN_URL: 'https://origin.test',
    DB: db,
    RL_FREE_BURST: fakeRL(1000),
  }
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
    const rl = fakeRL(1000)
    const e = { ...env, RATE_LIMIT_KV: kv, RL_FREE_BURST: rl }
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
    // La rafaga SI cubre cada peticion, incluida la que se sirve de cache:
    // 4 rutas + la lectura cacheada = 5 peticiones, 5 consultas al limiter.
    expect(rl.calls.length).toBe(5)
  })

  it('ruta abierta estatica sin binding DB sigue 200 (no se cuenta en D1)', async () => {
    origin()
    const e = { ORIGIN_URL: 'https://origin.test', RL_FREE_BURST: fakeRL(10) }
    const r = await get('/api/all.json', e)
    vi.unstubAllGlobals()
    expect(r.status).toBe(200)
  })

  it('la rafaga cubre TODOS los datos abiertos (OPEN_ROUTES), tambien sin D1', async () => {
    origin()
    const e = { ORIGIN_URL: 'https://origin.test', RL_FREE_BURST: fakeRL(2) }
    const st: number[] = []
    for (const p of [
      '/api/all.json',
      '/api/by-country/mx.json',
      '/graph-data.json',
    ]) {
      st.push((await get(p, e)).status)
    }
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 429])
    // La tercera no llego al origen: la rafaga corto antes de la cache/proxy.
    expect(originCalls).toBe(2)
  })

  it('fail-closed: sin RL_FREE_BURST responde 503 y no toca el origen', async () => {
    const { env } = setup()
    origin()
    const e: Record<string, unknown> = { ...env }
    delete e.RL_FREE_BURST
    for (const p of ['/api/all.json', '/api/entities/recipe']) {
      const r = await get(p, e)
      expect(r.status).toBe(503)
      expect(await r.json()).toEqual({ error: 'rate limiter unavailable' })
      expect(r.headers.get('retry-after')).toBe('60')
    }
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(originCalls).toBe(0)
  })

  it('fail-closed: RL_FREE_BURST que lanza responde 503 (no fail-open)', async () => {
    const { env } = setup()
    origin()
    const boom = {
      async limit(): Promise<{ success: boolean }> {
        throw new Error('RL_ERROR: injected failure (test)')
      },
    }
    const r = await get('/api/all.json', { ...env, RL_FREE_BURST: boom })
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ error: 'rate limiter unavailable' })
    expect(r.headers.get('retry-after')).toBe('60')
    expect(originCalls).toBe(0)
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
    expect(
      c.sqls.filter((q) => q.includes('INSERT INTO free_quota')),
    ).toHaveLength(5)
    // The quota table DDL runs at most once per isolate (lazy, idempotent).
    expect(
      c.sqls.filter((q) => q.includes('CREATE TABLE IF NOT EXISTS free_quota'))
        .length,
    ).toBeLessThanOrEqual(1)
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

  it('D1 caida en la cuota free: fail-closed, 503 y el dato no se sirve', async () => {
    const { env } = setup()
    origin()
    const bad = createFakeD1({ mode: 'throws', applySchema: true })
    const r = await get('/api/entities/recipe', { ...env, DB: bad.db })
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ error: 'rate limiter unavailable' })
    expect(r.headers.get('retry-after')).toBe('60')
    expect(originCalls).toBe(0)
  })

  it('sin binding DB las rutas no estaticas fallan cerrado (503); la rafaga sigue', async () => {
    origin()
    const e = { ORIGIN_URL: 'https://origin.test', RL_FREE_BURST: fakeRL(2) }
    const st: number[] = []
    for (let i = 0; i < 4; i++)
      st.push((await get('/api/entities/x', e)).status)
    const f = globalThis.fetch as ReturnType<typeof vi.fn>
    const originCalls = f.mock.calls.length
    vi.unstubAllGlobals()
    expect(st).toEqual([503, 503, 429, 429])
    expect(originCalls).toBe(0)
  })
})

describe('identidad del limite: solo CF-Connecting-IP', () => {
  const origin = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
    )

  it('sin CF-Connecting-IP, rotar X-Forwarded-For NO renueva el cubo', async () => {
    const { env } = setup()
    origin()
    const rl = fakeRL(2)
    const e = { ...env, RL_FREE_BURST: rl }
    const call = (xff: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'x-forwarded-for': xff },
        }),
        e as never,
      )
    const st = [
      (await call('1.1.1.1')).status,
      (await call('2.2.2.2')).status,
      (await call('3.3.3.3')).status,
    ]
    vi.unstubAllGlobals()
    expect(st).toEqual([200, 200, 429])
    // Todas comparten el unico cubo conservador, sin importar la XFF.
    expect(new Set(rl.calls)).toEqual(new Set(['anon:no-ip']))
  })

  it('con CF-Connecting-IP presente, X-Forwarded-For se ignora', async () => {
    const { env } = setup()
    origin()
    const rl = fakeRL(1)
    const e = { ...env, RL_FREE_BURST: rl }
    const call = (ip: string, xff: string) =>
      worker.fetch(
        new Request(`${GW}/api/all.json`, {
          headers: { 'cf-connecting-ip': ip, 'x-forwarded-for': xff },
        }),
        e as never,
      )
    expect((await call('9.9.9.9', '1.1.1.1')).status).toBe(200)
    // Misma IP, XFF distinta: mismo cubo => 429.
    expect((await call('9.9.9.9', '2.2.2.2')).status).toBe(429)
    // IP distinta: cubo distinto.
    expect((await call('8.8.8.8', '2.2.2.2')).status).toBe(200)
    vi.unstubAllGlobals()
    expect(rl.calls).toEqual(['ip:9.9.9.9', 'ip:9.9.9.9', 'ip:8.8.8.8'])
  })

  it('sin ninguna IP, la XFF rotada tampoco crea cubos nuevos en D1', async () => {
    const { fake, env } = setup()
    origin()
    const e = { ...env, FREE_DAILY_LIMIT: '2' }
    const call = (xff: string) =>
      worker.fetch(
        new Request(`${GW}/api/entities/recipe`, {
          headers: { 'x-forwarded-for': xff },
        }),
        e as never,
      )
    for (const xff of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) await call(xff)
    vi.unstubAllGlobals()
    const rows = await fake.db
      .prepare('SELECT ip_key, n FROM free_quota')
      .all<{ ip_key: string; n: number }>()
    // Una sola fila (bucket compartido), y el contador refleja los 3 intentos.
    expect(rows.results).toHaveLength(1)
    expect(rows.results?.[0].n).toBe(2)
    const expected = `ip:${(await sha256HexForTest('anon:no-ip')).slice(0, 32)}`
    expect(rows.results?.[0].ip_key).toBe(expected)
    expect(rows.results?.[0].ip_key).not.toContain('1.1.1.1')
  })
})

/** Espejo del hash del gateway: prueba que la clave D1 no guarda IPs crudas. */
async function sha256HexForTest(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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

describe('cuota diaria: la tabla se crea desde el binding D1', () => {
  it('sin tabla free_quota en D1, la primera ruta no estatica la crea y responde 200 (no 503)', async () => {
    __resetQuotaTableCacheForTests()
    const fake = createFakeD1({ applySchema: false })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true}', { status: 200 })),
    )
    const env = {
      ORIGIN_URL: 'https://origin.test',
      DB: fake.db,
      RL_FREE_BURST: fakeRL(1000),
    }
    const res = await worker.fetch(
      new Request(`${GW}/api/health`, {
        headers: { 'cf-connecting-ip': '9.9.9.9' },
      }),
      env as never,
    )
    expect(res.status).toBe(200)
    const row = await fake.db
      .prepare('SELECT n FROM free_quota')
      .first<{ n: number }>()
    expect(row?.n).toBe(1)
  })
})
